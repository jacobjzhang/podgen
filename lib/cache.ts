// File-based cache for generation intermediate steps
// Allows resuming generation if a later step fails, persists across server restarts
// Cache files stored in .cache/ directory for easy inspection/debugging

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { NewsItem, DialogueTurn } from './types';

const CACHE_DIR = join(process.cwd(), '.cache');

// Cache TTL: 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000;

// Ensure cache directory exists
function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[Cache] Created cache directory: ${CACHE_DIR}`);
  }
}

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function getCacheFilePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

function isExpired(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    return Date.now() - stats.mtimeMs > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

function readCache<T>(key: string): T | null {
  const filePath = getCacheFilePath(key);

  if (!existsSync(filePath)) {
    return null;
  }

  if (isExpired(filePath)) {
    console.log(`[Cache] EXPIRED - ${key}`);
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`[Cache] Error reading ${key}:`, err);
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  ensureCacheDir();
  const filePath = getCacheFilePath(key);

  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Cache] WRITE - ${filePath}`);
  } catch (err) {
    console.error(`[Cache] Error writing ${key}:`, err);
  }
}

// Cache keys
function newsKey(interests: string[]): string {
  return `news_${hash(interests.sort().join(','))}`;
}

function dialogueKey(newsItems: NewsItem[]): string {
  const newsHash = hash(newsItems.map(n => n.title).join('|'));
  return `dialogue_${newsHash}`;
}

// News cache
export function getCachedNews(interests: string[]): NewsItem[] | null {
  const key = newsKey(interests);
  const data = readCache<NewsItem[]>(key);

  if (data) {
    console.log(`[Cache] HIT - news for ${interests.length} interests (${data.length} items)`);
    return data;
  }

  console.log(`[Cache] MISS - news for ${interests.length} interests`);
  return null;
}

export function setCachedNews(interests: string[], news: NewsItem[]): void {
  const key = newsKey(interests);
  writeCache(key, news);
}

// Enriched news cache (news items with detailed summaries from GPT-5-nano)
function enrichedKey(newsItems: NewsItem[]): string {
  const newsHash = hash(newsItems.map(n => n.url).join('|'));
  return `enriched_${newsHash}`;
}

export function getCachedEnrichedNews(newsItems: NewsItem[]): NewsItem[] | null {
  const key = enrichedKey(newsItems);
  const data = readCache<NewsItem[]>(key);

  if (data) {
    console.log(`[Cache] HIT - enriched news (${data.length} items)`);
    return data;
  }

  console.log(`[Cache] MISS - enriched news`);
  return null;
}

export function setCachedEnrichedNews(originalNews: NewsItem[], enrichedNews: NewsItem[]): void {
  const key = enrichedKey(originalNews);
  writeCache(key, enrichedNews);
}

// Dialogue cache
export function getCachedDialogue(newsItems: NewsItem[]): DialogueTurn[] | null {
  const key = dialogueKey(newsItems);
  const data = readCache<DialogueTurn[]>(key);

  if (data) {
    console.log(`[Cache] HIT - dialogue (${data.length} turns)`);
    return data;
  }

  console.log(`[Cache] MISS - dialogue`);
  return null;
}

export function setCachedDialogue(newsItems: NewsItem[], dialogue: DialogueTurn[]): void {
  const key = dialogueKey(newsItems);
  writeCache(key, dialogue);
}

// Audio cache (stored as .mp3 files)
function audioKey(dialogue: DialogueTurn[]): string {
  const dialogueHash = hash(dialogue.map(d => `${d.speaker}:${d.text}`).join('|'));
  return `audio_${dialogueHash}`;
}

export function getCachedAudio(dialogue: DialogueTurn[]): string | null {
  const key = audioKey(dialogue);
  const filePath = join(CACHE_DIR, `${key}.mp3`);

  if (!existsSync(filePath)) {
    console.log(`[Cache] MISS - audio`);
    return null;
  }

  if (isExpired(filePath)) {
    console.log(`[Cache] EXPIRED - audio`);
    return null;
  }

  try {
    const buffer = readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const sizeKB = Math.round(buffer.length / 1024);
    console.log(`[Cache] HIT - audio (${sizeKB} KB from ${key}.mp3)`);
    return `data:audio/mpeg;base64,${base64}`;
  } catch (err) {
    console.error(`[Cache] Error reading audio:`, err);
    return null;
  }
}

export function setCachedAudio(dialogue: DialogueTurn[], audioDataUrl: string): void {
  ensureCacheDir();
  const key = audioKey(dialogue);
  const filePath = join(CACHE_DIR, `${key}.mp3`);

  try {
    // Extract base64 from data URL
    const base64 = audioDataUrl.replace(/^data:audio\/mpeg;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    writeFileSync(filePath, buffer);
    const sizeKB = Math.round(buffer.length / 1024);
    console.log(`[Cache] WRITE - ${key}.mp3 (${sizeKB} KB)`);
  } catch (err) {
    console.error(`[Cache] Error writing audio:`, err);
  }
}

// Cache stats and cleanup
export function logCacheStats(): void {
  ensureCacheDir();

  try {
    const files = readdirSync(CACHE_DIR);
    const newsFiles = files.filter(f => f.startsWith('news_'));
    const dialogueFiles = files.filter(f => f.startsWith('dialogue_'));
    const audioFiles = files.filter(f => f.startsWith('audio_'));

    console.log(`[Cache] ${files.length} files (${newsFiles.length} news, ${dialogueFiles.length} dialogue, ${audioFiles.length} audio) in ${CACHE_DIR}`);
  } catch {
    console.log(`[Cache] Empty or not accessible`);
  }
}

export function cleanupExpiredCache(): number {
  ensureCacheDir();

  let removed = 0;
  try {
    const files = readdirSync(CACHE_DIR);

    for (const file of files) {
      const filePath = join(CACHE_DIR, file);
      if (isExpired(filePath)) {
        unlinkSync(filePath);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired files`);
    }
  } catch (err) {
    console.error('[Cache] Cleanup error:', err);
  }

  return removed;
}
