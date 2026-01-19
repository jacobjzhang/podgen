// OpenAI GPT-5.2 client for dialogue generation
// Docs: https://platform.openai.com/docs/api-reference/chat

import { DialogueTurn, NewsItem } from './types';
import { buildUserPrompt, getSystemPrompt } from './prompts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Use the faster chat model for MVP; can switch to 'gpt-5.2' for better quality
const MODEL = 'gpt-5.2-chat-latest';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate podcast dialogue from news items using GPT-5.2
 */
export async function generateDialogue(
  newsItems: NewsItem[],
  speakerCount: number = 3
): Promise<DialogueTurn[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be set in environment');
  }

  if (newsItems.length === 0) {
    throw new Error('No news items provided for dialogue generation');
  }

  console.log(`[OpenAI] Building prompt with ${newsItems.length} news items...`);
  const systemPrompt = getSystemPrompt(undefined, speakerCount);
  const userPrompt = buildUserPrompt(newsItems, undefined, speakerCount);
  console.log(`[OpenAI] System prompt: ${systemPrompt.length} chars`);
  console.log(`[OpenAI] User prompt: ${userPrompt.length} chars`);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  console.log(`[OpenAI] Calling ${MODEL}...`);
  const startTime = Date.now();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      // Note: GPT-5.2 only supports default temperature (1)
      max_completion_tokens: 8192, // Enough for 80-100 dialogue turns
      response_format: { type: 'json_object' },
    }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    console.error(`[OpenAI] API error after ${elapsed}ms:`, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  console.log(`[OpenAI] Response received in ${elapsed}ms`);
  console.log(`[OpenAI] Tokens used: ${data.usage?.prompt_tokens} prompt + ${data.usage?.completion_tokens} completion = ${data.usage?.total_tokens} total`);

  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  console.log(`[OpenAI] Parsing dialogue JSON (${content.length} chars)...`);

  // Parse the JSON response
  try {
    const parsed = JSON.parse(content);
    // Handle both array and object with dialogue key
    const dialogue: DialogueTurn[] = Array.isArray(parsed) ? parsed : parsed.dialogue;

    if (!Array.isArray(dialogue)) {
      console.error('[OpenAI] Response structure:', Object.keys(parsed));
      throw new Error('Expected dialogue array in response');
    }

    // Validate and normalize the dialogue
    const allowedSpeakers = (['alex', 'jordan', 'casey', 'riley'] as const).slice(0, speakerCount);
    const normalized = dialogue.map(turn => {
      const rawSpeaker = String(turn.speaker || '').toLowerCase().trim();
      const speaker = (allowedSpeakers.includes(rawSpeaker as typeof allowedSpeakers[number])
        ? rawSpeaker
        : allowedSpeakers[0]) as typeof allowedSpeakers[number];

      return {
        speaker,
        text: String(turn.text).trim(),
      };
    }).filter(turn => turn.text.length > 0);

    console.log(`[OpenAI] Parsed ${normalized.length} dialogue turns:`);
    normalized.slice(0, 5).forEach((turn, i) => {
      const preview = turn.text.length > 80 ? turn.text.substring(0, 80) + '...' : turn.text;
      console.log(`[OpenAI]   ${i + 1}. ${turn.speaker.toUpperCase()}: "${preview}"`);
    });
    if (normalized.length > 5) {
      console.log(`[OpenAI]   ... and ${normalized.length - 5} more turns`);
    }
    return normalized;
  } catch (parseError) {
    console.error('[OpenAI] Failed to parse dialogue JSON:', content.substring(0, 500));
    throw new Error(`Failed to parse dialogue: ${parseError}`);
  }
}

/**
 * Estimate the speaking duration of dialogue in seconds
 * Assumes average speaking rate of 150 words per minute
 */
export function estimateDuration(dialogue: DialogueTurn[]): number {
  const totalWords = dialogue.reduce((sum, turn) => {
    return sum + turn.text.split(/\s+/).length;
  }, 0);

  const minutes = totalWords / 150;
  return Math.round(minutes * 60);
}
