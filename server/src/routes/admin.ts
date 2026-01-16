import { Router, Response } from 'express';
import db, { queries } from '../models/database.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all users
router.get('/users', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const users = queries.getAllUsers.all();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role
router.put('/users/:id/role', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { role, shipAssignment, taskforceAssignment } = req.body;

    if (!role) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    const validRoles = ['admin', 'ship_contributor', 'taskforce_lead', 'reviewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const stmt = db.prepare(`
      UPDATE users SET role = ?, ship_assignment = ?, taskforce_assignment = ?
      WHERE id = ?
    `);
    stmt.run(role, shipAssignment || null, taskforceAssignment || null, req.params.id);

    queries.logActivity.run(
      req.user!.id,
      'update_user_role',
      'users',
      parseInt(req.params.id),
      `Updated user role to ${role}`
    );

    res.json({ message: 'User role updated' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent self-deletion
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);

    queries.logActivity.run(
      req.user!.id,
      'delete_user',
      'users',
      userId,
      'Deleted user'
    );

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get dashboard stats
router.get('/dashboard', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;

    if (!currentYear) {
      res.json({
        message: 'No SOTFA year created yet',
        stats: null,
      });
      return;
    }

    // Section stats
    const sections = queries.getSectionsByYear.all(currentYear.id) as any[];
    const sectionStats = {
      total: sections.length,
      pending: sections.filter(s => s.status === 'pending').length,
      draft: sections.filter(s => s.status === 'draft').length,
      submitted: sections.filter(s => s.status === 'submitted').length,
      approved: sections.filter(s => s.status === 'approved').length,
    };

    // User stats
    const userStats = db.prepare(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `).all() as any[];

    // Recent activity
    const recentActivity = queries.getRecentActivity.all(10) as any[];

    // Deadline info
    const overdueSections = sections.filter(s =>
      s.deadline && new Date(s.deadline) < new Date() && s.status !== 'approved'
    );

    // AI usage stats
    const aiUsageToday = db.prepare(`
      SELECT COUNT(*) as requests, SUM(tokens_used) as tokens
      FROM ai_usage WHERE date(created_at) = date('now')
    `).get() as any;

    res.json({
      year: currentYear,
      sectionStats,
      userStats,
      recentActivity,
      overdueSections,
      aiUsage: aiUsageToday,
      progress: Math.round((sectionStats.approved / sectionStats.total) * 100) || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Set section deadlines
router.put('/deadlines', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { sectionDeadlines } = req.body;

    if (!sectionDeadlines || !Array.isArray(sectionDeadlines)) {
      res.status(400).json({ error: 'Section deadlines array required' });
      return;
    }

    const stmt = db.prepare('UPDATE sections SET deadline = ? WHERE id = ?');

    sectionDeadlines.forEach(({ sectionId, deadline }: { sectionId: number; deadline: string }) => {
      stmt.run(deadline, sectionId);
    });

    queries.logActivity.run(
      req.user!.id,
      'update_deadlines',
      'sections',
      null,
      `Updated ${sectionDeadlines.length} section deadlines`
    );

    res.json({ message: 'Deadlines updated' });
  } catch (error) {
    console.error('Error updating deadlines:', error);
    res.status(500).json({ error: 'Failed to update deadlines' });
  }
});

// Assign sections to users
router.put('/assignments', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments)) {
      res.status(400).json({ error: 'Assignments array required' });
      return;
    }

    const stmt = db.prepare('UPDATE sections SET assigned_to = ? WHERE id = ?');

    assignments.forEach(({ sectionId, userId }: { sectionId: number; userId: number | null }) => {
      stmt.run(userId, sectionId);
    });

    queries.logActivity.run(
      req.user!.id,
      'update_assignments',
      'sections',
      null,
      `Updated ${assignments.length} section assignments`
    );

    res.json({ message: 'Assignments updated' });
  } catch (error) {
    console.error('Error updating assignments:', error);
    res.status(500).json({ error: 'Failed to update assignments' });
  }
});

// Publish SOTFA (change status)
router.post('/publish', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;

    if (!currentYear) {
      res.status(404).json({ error: 'No SOTFA year found' });
      return;
    }

    // Check all sections are approved
    const sections = queries.getSectionsByYear.all(currentYear.id) as any[];
    const unapproved = sections.filter(s => s.status !== 'approved');

    if (unapproved.length > 0) {
      res.status(400).json({
        error: 'Cannot publish - some sections are not approved',
        unapprovedSections: unapproved.map(s => s.title),
      });
      return;
    }

    queries.updateYearStatus.run('published', new Date().toISOString(), currentYear.id);

    queries.logActivity.run(
      req.user!.id,
      'publish_sotfa',
      'sotfa_years',
      currentYear.id,
      `Published SOTFA ${currentYear.year}`
    );

    res.json({ message: 'SOTFA published successfully' });
  } catch (error) {
    console.error('Error publishing SOTFA:', error);
    res.status(500).json({ error: 'Failed to publish SOTFA' });
  }
});

// Export to Google Doc format
router.get('/export/gdoc', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;

    if (!currentYear) {
      res.status(404).json({ error: 'No SOTFA year found' });
      return;
    }

    // Generate plain text version suitable for Google Docs
    const sections = queries.getSectionsByYear.all(currentYear.id) as any[];
    const shipReports = db.prepare(`
      SELECT sr.*, s.title FROM ship_reports sr
      JOIN sections s ON sr.section_id = s.id
      WHERE s.sotfa_year_id = ?
    `).all(currentYear.id) as any[];

    let content = `${currentYear.year} STATE OF THE FEDERATION ADDRESS\n\n`;
    content += `Draft for Review - Generated ${new Date().toLocaleDateString()}\n\n`;
    content += '='.repeat(60) + '\n\n';

    sections.forEach(section => {
      if (section.section_type === 'ship_report') {
        const report = shipReports.find(sr => sr.section_id === section.id);
        if (report) {
          content += `\n## ${report.ship_name}\n\n`;
          content += `CO: ${report.co_character}\n`;
          content += `XO: ${report.xo_character}\n\n`;
          content += `${report.summary || '[Summary pending]'}\n\n`;
        }
      } else {
        content += `\n## ${section.title}\n\n`;
        content += `${section.content || '[Content pending]'}\n\n`;
      }
      content += '-'.repeat(40) + '\n';
    });

    res.json({
      content,
      year: currentYear.year,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error exporting to Google Doc:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

export default router;
