import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { checkAIUsageLimit, generateShipSummary, generateTaskforceSummary, improveContent } from '../services/ai.js';

const router = Router();

// Check AI usage limits
router.get('/usage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const usage = await checkAIUsageLimit(req.user!.id);
    res.json(usage);
  } catch (error) {
    console.error('Error checking AI usage:', error);
    res.status(500).json({ error: 'Failed to check AI usage' });
  }
});

// Generate ship summary from monthly summaries
router.post('/ship-summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { shipName, monthlySummaries, existingContent } = req.body;

    if (!shipName || !monthlySummaries || !Array.isArray(monthlySummaries)) {
      res.status(400).json({ error: 'Ship name and monthly summaries array required' });
      return;
    }

    const result = await generateShipSummary(
      req.user!.id,
      shipName,
      monthlySummaries,
      existingContent
    );

    if (!result.success) {
      res.status(429).json({ error: result.error });
      return;
    }

    res.json({
      summary: result.content,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Error generating ship summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Generate taskforce summary
router.post('/taskforce-summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { taskforceName, activities, memberCount } = req.body;

    if (!taskforceName || !activities) {
      res.status(400).json({ error: 'Taskforce name and activities required' });
      return;
    }

    const result = await generateTaskforceSummary(
      req.user!.id,
      taskforceName,
      activities,
      memberCount || 0
    );

    if (!result.success) {
      res.status(429).json({ error: result.error });
      return;
    }

    res.json({
      summary: result.content,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Error generating taskforce summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Improve existing content
router.post('/improve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, instructions } = req.body;

    if (!content || !instructions) {
      res.status(400).json({ error: 'Content and instructions required' });
      return;
    }

    const result = await improveContent(req.user!.id, content, instructions);

    if (!result.success) {
      res.status(429).json({ error: result.error });
      return;
    }

    res.json({
      improvedContent: result.content,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Error improving content:', error);
    res.status(500).json({ error: 'Failed to improve content' });
  }
});

export default router;
