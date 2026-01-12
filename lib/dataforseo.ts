// DataForSEO API client for fetching news and trends
// Docs: https://docs.dataforseo.com/v3/

import { NewsItem, TrendData } from './types';

const BASE_URL = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in environment');
  }

  const credentials = Buffer.from(`${login}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

interface DataForSEOResponse<T> {
  status_code: number;
  status_message: string;
  tasks: Array<{
    result: T[];
  }>;
}

interface NewsResult {
  items?: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
    timestamp?: string;
  }>;
}

interface TrendsResult {
  items?: Array<{
    keywords: string[];
    values: number[];
  }>;
}

/**
 * Fetch latest news for a given interest/topic using Google News SERP
 */
export async function fetchNews(interest: string, limit: number = 5): Promise<NewsItem[]> {
  console.log(`[DataForSEO] Fetching news for "${interest}"...`);
  const startTime = Date.now();

  const response = await fetch(`${BASE_URL}/serp/google/news/live/advanced`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keyword: interest,
      language_code: 'en',
      location_code: 2840, // United States
      depth: limit,
    }]),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    console.error(`[DataForSEO] API error for "${interest}" after ${elapsed}ms: ${response.status}`);
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
  }

  const data: DataForSEOResponse<NewsResult> = await response.json();

  if (data.status_code !== 20000) {
    console.error(`[DataForSEO] Error for "${interest}": ${data.status_message}`);
    throw new Error(`DataForSEO error: ${data.status_message}`);
  }

  const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
  console.log(`[DataForSEO] Got ${items.length} news items for "${interest}" in ${elapsed}ms`);

  const mapped = items.slice(0, limit).map(item => ({
    title: item.title,
    snippet: item.snippet || '',
    url: item.url,
    source: item.source || 'Unknown',
    publishedAt: item.timestamp,
  }));

  // Log headlines
  mapped.forEach((item, i) => {
    console.log(`[DataForSEO]   ${i + 1}. "${item.title}" (${item.source})`);
  });

  return mapped;
}

/**
 * Fetch news for multiple interests in parallel
 */
export async function fetchNewsForInterests(interests: string[], limit: number = 3): Promise<NewsItem[]> {
  console.log(`[DataForSEO] Fetching news for ${interests.length} interests in parallel...`);
  const startTime = Date.now();

  const results = await Promise.all(
    interests.map(interest => fetchNews(interest, limit))
  );

  // Flatten and dedupe by URL
  const seen = new Set<string>();
  const allNews: NewsItem[] = [];

  for (const items of results) {
    for (const item of items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        allNews.push(item);
      }
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[DataForSEO] Total: ${allNews.length} unique news items in ${elapsed}ms`);

  return allNews;
}

/**
 * Fetch trending data for keywords using Google Trends
 */
export async function fetchTrends(keywords: string[]): Promise<TrendData[]> {
  // Google Trends API supports up to 5 keywords at once
  const keywordsToFetch = keywords.slice(0, 5);

  const response = await fetch(`${BASE_URL}/keywords_data/google_trends/explore/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: keywordsToFetch,
      location_code: 2840, // United States
      language_code: 'en',
      type: 'web', // web search trends
      time_range: 'past_7_days',
    }]),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO Trends API error: ${response.status} ${response.statusText}`);
  }

  const data: DataForSEOResponse<TrendsResult> = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO Trends error: ${data.status_message}`);
  }

  const result = data.tasks?.[0]?.result?.[0];
  if (!result?.items) {
    return keywords.map(keyword => ({
      keyword,
      interest: 50, // default middle value
      relatedTopics: [],
    }));
  }

  // Map trend data back to keywords
  return keywordsToFetch.map((keyword, index) => ({
    keyword,
    interest: result.items?.[index]?.values?.[0] ?? 50,
    relatedTopics: [],
  }));
}
