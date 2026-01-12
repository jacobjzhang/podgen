// Article enrichment using GPT-5-nano for detailed summaries
// Fetches article content and extracts key details for richer podcast dialogue

import { NewsItem } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface EnrichedNewsItem extends NewsItem {
  detailedSummary: string;
  keyDetails: string[];
  quotes: string[];
  numbers: string[];
}

/**
 * Fetch article content from URL
 * Uses a simple fetch with timeout, extracts text content
 */
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Podgen/1.0; +https://podgen.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[Enricher] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract text content from HTML (basic extraction)
    // Remove scripts, styles, and HTML tags
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to first ~8000 chars (roughly 2000 tokens) to stay within context
    return text.slice(0, 8000);
  } catch (error) {
    console.log(`[Enricher] Error fetching ${url}:`, error instanceof Error ? error.message : 'Unknown');
    return null;
  }
}

/**
 * Use GPT-5-nano to extract key details from article content
 */
async function summarizeArticle(
  title: string,
  content: string,
  apiKey: string
): Promise<{ summary: string; keyDetails: string[]; quotes: string[]; numbers: string[] }> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You extract key information from news articles for podcast discussion. Be concise but capture the INTERESTING details that make for good conversation.

Output JSON with:
- summary: 2-3 sentence summary with the most newsworthy facts
- keyDetails: Array of 3-5 specific, interesting details (names, places, specific facts)
- quotes: Array of 1-2 notable quotes from the article (if any)
- numbers: Array of specific numbers/statistics mentioned (dollar amounts, percentages, dates, etc.)

Focus on details that would spark discussion: surprising facts, controversies, implications, who's involved.`
        },
        {
          role: 'user',
          content: `Article title: "${title}"\n\nArticle content:\n${content}`
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Enricher] GPT-5-nano error:`, error);
    throw new Error(`GPT-5-nano API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    summary: result.summary || '',
    keyDetails: result.keyDetails || [],
    quotes: result.quotes || [],
    numbers: result.numbers || [],
  };
}

/**
 * Enrich a single news item with detailed summary
 */
async function enrichNewsItem(
  item: NewsItem,
  apiKey: string
): Promise<EnrichedNewsItem> {
  console.log(`[Enricher] Enriching: "${item.title.slice(0, 50)}..."`);

  // Fetch article content
  const content = await fetchArticleContent(item.url);

  if (!content || content.length < 200) {
    // Not enough content, return with original snippet
    console.log(`[Enricher] Insufficient content, using snippet`);
    return {
      ...item,
      detailedSummary: item.snippet,
      keyDetails: [],
      quotes: [],
      numbers: [],
    };
  }

  // Summarize with GPT-5-nano
  try {
    const { summary, keyDetails, quotes, numbers } = await summarizeArticle(
      item.title,
      content,
      apiKey
    );

    console.log(`[Enricher] Got ${keyDetails.length} details, ${quotes.length} quotes, ${numbers.length} numbers`);

    return {
      ...item,
      detailedSummary: summary || item.snippet,
      keyDetails,
      quotes,
      numbers,
    };
  } catch (error) {
    console.error(`[Enricher] Summarization failed:`, error);
    return {
      ...item,
      detailedSummary: item.snippet,
      keyDetails: [],
      quotes: [],
      numbers: [],
    };
  }
}

/**
 * Enrich multiple news items in parallel
 * Limits concurrency to avoid rate limits
 */
export async function enrichNewsItems(items: NewsItem[]): Promise<EnrichedNewsItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('[Enricher] No OPENAI_API_KEY, skipping enrichment');
    return items.map(item => ({
      ...item,
      detailedSummary: item.snippet,
      keyDetails: [],
      quotes: [],
      numbers: [],
    }));
  }

  console.log(`[Enricher] Enriching ${items.length} articles with GPT-5-nano...`);
  const startTime = Date.now();

  // Process in batches of 3 to avoid overwhelming
  const batchSize = 3;
  const results: EnrichedNewsItem[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => enrichNewsItem(item, apiKey))
    );
    results.push(...batchResults);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Enricher] Enriched ${results.length} articles in ${elapsed}ms`);

  return results;
}

export type { EnrichedNewsItem };
