import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { fetchRoster, fetchRosterByShip, fetchCommandStaff, fetchYearlyStats, getShipsFromRoster } from '../services/sheets.js';
import { fetchActiveShips, fetchTaskforces, fetchWikiPage, searchWiki, fetchPreviousSOTFA } from '../services/wiki.js';

const router = Router();

// Get roster data from Google Sheets
router.get('/roster', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchRoster();

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ roster: result.data });
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Get roster for specific ship
router.get('/roster/:ship', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchRosterByShip(req.params.ship);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ roster: result.data });
  } catch (error) {
    console.error('Error fetching ship roster:', error);
    res.status(500).json({ error: 'Failed to fetch ship roster' });
  }
});

// Get command staff
router.get('/command-staff', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchCommandStaff();

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ commandStaff: result.data });
  } catch (error) {
    console.error('Error fetching command staff:', error);
    res.status(500).json({ error: 'Failed to fetch command staff' });
  }
});

// Get list of ships
router.get('/ships', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Try Google Sheets first
    const sheetsShips = await getShipsFromRoster();

    if (sheetsShips.length > 0) {
      res.json({ ships: sheetsShips, source: 'sheets' });
      return;
    }

    // Fall back to wiki
    const wikiResult = await fetchActiveShips();

    if (!wikiResult.success) {
      res.status(500).json({ error: wikiResult.error });
      return;
    }

    const ships = (wikiResult.data as any[]).map(s => s.title);
    res.json({ ships, source: 'wiki' });
  } catch (error) {
    console.error('Error fetching ships:', error);
    res.status(500).json({ error: 'Failed to fetch ships' });
  }
});

// Get simming stats from Project Aria
router.get('/stats/:year', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    const result = await fetchYearlyStats(year);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ stats: result.data, year });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch simming stats' });
  }
});

// Get taskforce information from wiki
router.get('/taskforces', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchTaskforces();

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ taskforces: result.data });
  } catch (error) {
    console.error('Error fetching taskforces:', error);
    res.status(500).json({ error: 'Failed to fetch taskforces' });
  }
});

// Get previous SOTFA for reference
router.get('/previous-sotfa/:year', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    const result = await fetchPreviousSOTFA(year);

    if (!result.success) {
      res.status(404).json({ error: 'Previous SOTFA not found' });
      return;
    }

    res.json({ sotfa: result.data });
  } catch (error) {
    console.error('Error fetching previous SOTFA:', error);
    res.status(500).json({ error: 'Failed to fetch previous SOTFA' });
  }
});

// Search wiki
router.get('/wiki/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      res.status(400).json({ error: 'Search query required' });
      return;
    }

    const result = await searchWiki(query, limit);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ results: result.data });
  } catch (error) {
    console.error('Error searching wiki:', error);
    res.status(500).json({ error: 'Wiki search failed' });
  }
});

// Fetch specific wiki page
router.get('/wiki/page/:title', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchWikiPage(decodeURIComponent(req.params.title));

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json({ page: result.data });
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    res.status(500).json({ error: 'Failed to fetch wiki page' });
  }
});

export default router;
