import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queries } from '../models/database.js';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register new user (admin only in production, open for initial setup)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName, role, shipAssignment, taskforceAssignment, wikiUsername } = req.body;

    // Validate required fields
    if (!username || !email || !password || !displayName || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if user exists
    const existingUser = queries.getUserByUsername.get(username) || queries.getUserByEmail.get(email);
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = queries.createUser.run(
      username,
      email,
      passwordHash,
      displayName,
      role,
      shipAssignment || null,
      taskforceAssignment || null,
      wikiUsername || null
    );

    const user = queries.getUserById.get(result.lastInsertRowid) as any;
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        shipAssignment: user.ship_assignment,
        taskforceAssignment: user.taskforce_assignment,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    // Find user
    const user = queries.getUserByUsername.get(username) as any;
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    queries.updateUserLastLogin.run(user.id);

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        shipAssignment: user.ship_assignment,
        taskforceAssignment: user.taskforce_assignment,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.display_name,
      role: req.user.role,
      shipAssignment: req.user.ship_assignment,
      taskforceAssignment: req.user.taskforce_assignment,
    },
  });
});

// Update password
router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password required' });
      return;
    }

    const user = queries.getUserById.get(req.user.id) as any;
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const stmt = (await import('../models/database.js')).default.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    );
    stmt.run(newHash, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
