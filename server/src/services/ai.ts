import Anthropic from '@anthropic-ai/sdk';
import { queries } from '../models/database.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || '50');
const TOKENS_PER_REQUEST = parseInt(process.env.AI_TOKENS_PER_REQUEST || '4000');

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  tokensUsed?: number;
}

export async function checkAIUsageLimit(userId: number): Promise<{ allowed: boolean; remaining: number }> {
  const result = queries.getAIUsageToday.get(userId) as { total: number | null };
  const used = result?.total || 0;
  const remaining = DAILY_LIMIT - Math.floor(used / TOKENS_PER_REQUEST);
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

export async function generateShipSummary(
  userId: number,
  shipName: string,
  monthlySummaries: string[],
  existingContent?: string
): Promise<AIResponse> {
  const usageCheck = await checkAIUsageLimit(userId);
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: 'Daily AI usage limit reached. Please try again tomorrow.',
    };
  }

  const prompt = `You are helping create the annual State of the Federation Address for Starbase 118, a Star Trek play-by-email role-playing game.

Given the following monthly summaries for the ${shipName}, generate a cohesive yearly summary suitable for the SOTFA. The summary should:
- Be approximately 150-250 words
- Highlight key missions, character developments, and achievements
- Mention any significant crew changes or promotions
- Note any fleet-wide events the ship participated in
- Be written in a positive, celebratory tone befitting an annual address
- Use past tense for events that occurred during the year

${existingContent ? `Previous draft (use as reference but improve upon it):\n${existingContent}\n\n` : ''}

Monthly summaries:
${monthlySummaries.map((s, i) => `Month ${i + 1}: ${s}`).join('\n\n')}

Generate ONLY the summary text, no additional commentary or formatting.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: TOKENS_PER_REQUEST,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    // Log usage
    queries.logAIUsage.run(userId, 'ship_summary', tokensUsed);

    return {
      success: true,
      content,
      tokensUsed,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      error: 'Failed to generate summary. Please try again.',
    };
  }
}

export async function generateTaskforceSummary(
  userId: number,
  taskforceName: string,
  activities: string,
  memberCount: number
): Promise<AIResponse> {
  const usageCheck = await checkAIUsageLimit(userId);
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: 'Daily AI usage limit reached. Please try again tomorrow.',
    };
  }

  const prompt = `You are helping create the annual State of the Federation Address for Starbase 118, a Star Trek play-by-email role-playing game.

Generate a brief summary (2-3 sentences) for the ${taskforceName} taskforce with ${memberCount} members.

Activities and notes provided:
${activities}

The summary should be concise and highlight the taskforce's key contributions to the fleet. Generate ONLY the summary text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    queries.logAIUsage.run(userId, 'taskforce_summary', tokensUsed);

    return {
      success: true,
      content,
      tokensUsed,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      error: 'Failed to generate summary. Please try again.',
    };
  }
}

export async function improveContent(
  userId: number,
  content: string,
  instructions: string
): Promise<AIResponse> {
  const usageCheck = await checkAIUsageLimit(userId);
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: 'Daily AI usage limit reached. Please try again tomorrow.',
    };
  }

  const prompt = `You are helping edit content for the annual State of the Federation Address for Starbase 118, a Star Trek play-by-email role-playing game.

Original content:
${content}

Instructions for improvement:
${instructions}

Provide the improved content ONLY, no additional commentary.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: TOKENS_PER_REQUEST,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    queries.logAIUsage.run(userId, 'improve_content', tokensUsed);

    return {
      success: true,
      content: responseContent,
      tokensUsed,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      error: 'Failed to improve content. Please try again.',
    };
  }
}
