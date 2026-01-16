import { Router, Response } from 'express';
import db, { queries } from '../models/database.js';
import { authenticate, requireRole, canEditSection, AuthRequest } from '../middleware/auth.js';
import { generateFromDatabase, previewSection } from '../services/wikiGenerator.js';

const router = Router();

// Get current SOTFA year and all sections
router.get('/current', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;

    if (!currentYear) {
      res.status(404).json({ error: 'No SOTFA year found. Create one first.' });
      return;
    }

    const sections = queries.getSectionsByYear.all(currentYear.id) as any[];

    // Get section statuses summary
    const statusCounts = {
      pending: sections.filter(s => s.status === 'pending').length,
      draft: sections.filter(s => s.status === 'draft').length,
      submitted: sections.filter(s => s.status === 'submitted').length,
      approved: sections.filter(s => s.status === 'approved').length,
    };

    res.json({
      year: currentYear,
      sections,
      statusCounts,
      progress: Math.round((statusCounts.approved / sections.length) * 100) || 0,
    });
  } catch (error) {
    console.error('Error fetching SOTFA:', error);
    res.status(500).json({ error: 'Failed to fetch SOTFA data' });
  }
});

// Create new SOTFA year (admin only)
router.post('/year', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { year, deadline } = req.body;

    if (!year) {
      res.status(400).json({ error: 'Year is required' });
      return;
    }

    // Check if year exists
    const existing = db.prepare('SELECT * FROM sotfa_years WHERE year = ?').get(year);
    if (existing) {
      res.status(409).json({ error: 'SOTFA year already exists' });
      return;
    }

    // Create year
    const result = queries.createYear.run(year, 'draft', deadline || null);
    const yearId = result.lastInsertRowid;

    // Create default sections
    const defaultSections = [
      { type: 'intro', key: 'intro', title: 'Introduction', order: 1 },
      { type: 'ec_report', key: 'ec_report', title: 'Executive Council Report', order: 2 },
      { type: 'cc_report', key: 'cc_report', title: "Captain's Council Report", order: 3 },
      // Ship reports will be created dynamically
      { type: 'simming_rates', key: 'simming_rates', title: 'Fleet Simming Rates', order: 100 },
      { type: 'taskforces', key: 'taskforces', title: 'Taskforce Contacts', order: 101 },
      { type: 'looking_ahead', key: 'looking_ahead', title: `Looking Ahead to ${year + 1}`, order: 102 },
    ];

    const insertSection = db.prepare(`
      INSERT INTO sections (sotfa_year_id, section_type, section_key, title, status, order_index)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);

    defaultSections.forEach(section => {
      insertSection.run(yearId, section.type, section.key, section.title, section.order);
    });

    queries.logActivity.run(req.user!.id, 'create_year', 'sotfa_years', yearId, `Created SOTFA ${year}`);

    res.status(201).json({
      message: 'SOTFA year created',
      yearId,
      year,
    });
  } catch (error) {
    console.error('Error creating SOTFA year:', error);
    res.status(500).json({ error: 'Failed to create SOTFA year' });
  }
});

// Add ship report section
router.post('/ship', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;
    if (!currentYear) {
      res.status(404).json({ error: 'No SOTFA year found' });
      return;
    }

    const { shipName, coName, coCharacter, xoName, xoCharacter, imageUrl, assignedTo, deadline } = req.body;

    if (!shipName) {
      res.status(400).json({ error: 'Ship name is required' });
      return;
    }

    // Get max order for ship reports
    const maxOrder = db.prepare(`
      SELECT MAX(order_index) as max_order FROM sections
      WHERE sotfa_year_id = ? AND section_type = 'ship_report'
    `).get(currentYear.id) as any;

    const orderIndex = (maxOrder?.max_order || 9) + 1;
    const sectionKey = `ship_${shipName.toLowerCase().replace(/\s+/g, '_')}`;

    // Create section
    const sectionResult = queries.createSection.run(
      currentYear.id,
      'ship_report',
      sectionKey,
      shipName,
      null, // content
      'pending',
      assignedTo || null,
      deadline || null,
      orderIndex
    );

    const sectionId = sectionResult.lastInsertRowid;

    // Create ship report record
    queries.createShipReport.run(
      sectionId,
      shipName,
      coName || null,
      coCharacter || null,
      xoName || null,
      xoCharacter || null,
      imageUrl || null,
      null, // summary
      null, // highlights
      null, // missions
      null  // ooc_notes
    );

    queries.logActivity.run(req.user!.id, 'add_ship', 'sections', sectionId, `Added ship report for ${shipName}`);

    res.status(201).json({
      message: 'Ship report section added',
      sectionId,
      sectionKey,
    });
  } catch (error) {
    console.error('Error adding ship:', error);
    res.status(500).json({ error: 'Failed to add ship report' });
  }
});

// Get section by ID
router.get('/section/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const section = queries.getSectionById.get(req.params.id) as any;

    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    let additionalData = null;

    if (section.section_type === 'ship_report') {
      additionalData = queries.getShipReportBySection.get(section.id);
    }

    // Get comments
    const comments = db.prepare(`
      SELECT c.*, u.display_name, u.username FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.section_id = ?
      ORDER BY c.created_at DESC
    `).all(section.id);

    res.json({
      section,
      shipReport: additionalData,
      comments,
    });
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// Update section content
router.put('/section/:id', authenticate, canEditSection, async (req: AuthRequest, res: Response) => {
  try {
    const section = queries.getSectionById.get(req.params.id) as any;

    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    // Check permissions for non-admins
    if (req.user!.role !== 'admin') {
      if (section.section_type === 'ship_report') {
        const shipReport = queries.getShipReportBySection.get(section.id) as any;
        if (req.user!.ship_assignment !== shipReport?.ship_name) {
          res.status(403).json({ error: 'You can only edit your own ship report' });
          return;
        }
      } else if (req.user!.role === 'taskforce_lead') {
        // Check taskforce assignment
        if (!section.section_key?.includes(req.user!.taskforce_assignment?.toLowerCase())) {
          res.status(403).json({ error: 'You can only edit your own taskforce section' });
          return;
        }
      }
    }

    const { content, status } = req.body;

    if (content !== undefined) {
      queries.updateSectionContent.run(content, status || 'draft', section.id);
    }

    // Update ship report if applicable
    if (section.section_type === 'ship_report' && req.body.shipReport) {
      const sr = req.body.shipReport;
      const existing = queries.getShipReportBySection.get(section.id) as any;

      if (existing) {
        queries.updateShipReport.run(
          sr.coName || existing.co_name,
          sr.coCharacter || existing.co_character,
          sr.xoName || existing.xo_name,
          sr.xoCharacter || existing.xo_character,
          sr.imageUrl || existing.image_url,
          sr.summary || existing.summary,
          sr.highlights || existing.highlights,
          sr.missions || existing.missions,
          sr.oocNotes || existing.ooc_notes,
          existing.id
        );
      }
    }

    queries.logActivity.run(
      req.user!.id,
      'update_section',
      'sections',
      section.id,
      `Updated ${section.title}`
    );

    res.json({ message: 'Section updated' });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Submit section for review
router.post('/section/:id/submit', authenticate, canEditSection, (req: AuthRequest, res: Response) => {
  try {
    const section = queries.getSectionById.get(req.params.id) as any;

    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    queries.updateSectionStatus.run('submitted', section.id);

    queries.logActivity.run(
      req.user!.id,
      'submit_section',
      'sections',
      section.id,
      `Submitted ${section.title} for review`
    );

    res.json({ message: 'Section submitted for review' });
  } catch (error) {
    console.error('Error submitting section:', error);
    res.status(500).json({ error: 'Failed to submit section' });
  }
});

// Approve section (admin only)
router.post('/section/:id/approve', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const section = queries.getSectionById.get(req.params.id) as any;

    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    queries.updateSectionStatus.run('approved', section.id);

    queries.logActivity.run(
      req.user!.id,
      'approve_section',
      'sections',
      section.id,
      `Approved ${section.title}`
    );

    res.json({ message: 'Section approved' });
  } catch (error) {
    console.error('Error approving section:', error);
    res.status(500).json({ error: 'Failed to approve section' });
  }
});

// Add comment to section
router.post('/section/:id/comment', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    const stmt = db.prepare('INSERT INTO comments (section_id, user_id, comment) VALUES (?, ?, ?)');
    const result = stmt.run(req.params.id, req.user!.id, comment);

    res.status(201).json({
      message: 'Comment added',
      commentId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Generate wiki code
router.get('/generate', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const currentYear = queries.getCurrentYear.get() as any;

    if (!currentYear) {
      res.status(404).json({ error: 'No SOTFA year found' });
      return;
    }

    const wikiCode = generateFromDatabase(currentYear.id);

    res.json({
      wikiCode,
      year: currentYear.year,
    });
  } catch (error) {
    console.error('Error generating wiki code:', error);
    res.status(500).json({ error: 'Failed to generate wiki code' });
  }
});

// Preview section wiki code
router.post('/preview', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { sectionType, content } = req.body;
    const preview = previewSection(sectionType, content);

    res.json({ preview });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Get activity log
router.get('/activity', authenticate, requireRole('admin'), (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = queries.getRecentActivity.all(limit);

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

export default router;
