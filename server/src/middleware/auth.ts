import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queries } from '../models/database.js';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'ship_contributor' | 'taskforce_lead' | 'reviewer';
  ship_assignment?: string;
  taskforce_assignment?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: number; username: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
  } catch {
    return null;
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = queries.getUserById.get(decoded.id) as AuthUser | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function canEditSection(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admins can edit anything
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Reviewers cannot edit
  if (req.user.role === 'reviewer') {
    res.status(403).json({ error: 'Reviewers cannot edit sections' });
    return;
  }

  // For ship_contributor and taskforce_lead, we'll check in the route handler
  // if they have permission for the specific section
  next();
}
