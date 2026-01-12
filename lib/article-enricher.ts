// Article enrichment using GPT-5-nano for detailed summaries
// Fetches article content and extracts key details for richer podcast dialogue

import { NewsItem } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface EnrichedNewsItem extends NewsItem {
  detailedSummary: string;
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
        // Use a realistic browser User-Agent to avoid bot blocking
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
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
 * Use GPT-5-nano to create a detailed summary of the article
 */
async function summarizeArticle(
  title: string,
  content: string,
  apiKey: string
): Promise<string> {
  // Truncate content to ~4000 chars to leave room for output
  const truncatedContent = content.slice(0, 4000);

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
          content: `Summarize this news article in 3-4 sentences for a podcast discussion. Include specific details that make it interesting: names of people involved, exact numbers/dollar amounts, direct quotes, and any surprising or controversial aspects. Be specific, not generic.`
        },
        {
          role: 'user',
          content: `${title}\n\n${truncatedContent}`
        }
      ],
      max_completion_tokens: 300,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Enricher] GPT-5-nano error:`, error);
    throw new Error(`GPT-5-nano API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    console.warn(`[Enricher] GPT-5-nano no choices`);
    return '';
  }

  const choice = data.choices[0];
  const summary = choice?.message?.content?.trim() || '';

  if (summary) {
    console.log(`[Enricher] Summary: "${summary.slice(0, 80)}..."`);
  } else {
    console.warn(`[Enricher] Empty summary. finish_reason: ${choice.finish_reason}`);
  }

  return summary;
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
    console.log(`[Enricher] Insufficient content (${content?.length || 0} chars), using snippet`);
    return {
      ...item,
      detailedSummary: item.snippet,
    };
  }

  console.log(`[Enricher] Fetched ${content.length} chars, summarizing...`);

  // Summarize with GPT-5-nano
  try {
    const summary = await summarizeArticle(item.title, content, apiKey);

    return {
      ...item,
      detailedSummary: summary || item.snippet,
    };
  } catch (error) {
    console.error(`[Enricher] Summarization failed:`, error);
    return {
      ...item,
      detailedSummary: item.snippet,
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
