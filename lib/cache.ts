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

function dialogueKey(newsItems: NewsItem[], speakerCount: number): string {
  const newsHash = hash(newsItems.map(n => `${n.title}:${n.url}:${n.snippet}`).join('|'));
  return `dialogue_${newsHash}_s${speakerCount}`;
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
  const newsHash = hash(newsItems.map(n => `${n.url}:${n.title}:${n.snippet}`).join('|'));
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
export function getCachedDialogue(newsItems: NewsItem[], speakerCount: number): DialogueTurn[] | null {
  const key = dialogueKey(newsItems, speakerCount);
  const data = readCache<DialogueTurn[]>(key);

  if (data) {
    console.log(`[Cache] HIT - dialogue (${data.length} turns)`);
    return data;
  }

  console.log(`[Cache] MISS - dialogue`);
  return null;
}

export function setCachedDialogue(
  newsItems: NewsItem[],
  dialogue: DialogueTurn[],
  speakerCount: number
): void {
  const key = dialogueKey(newsItems, speakerCount);
  writeCache(key, dialogue);
}

// Audio cache (stored as .mp3 or .wav)
export function getAudioKey(dialogue: DialogueTurn[]): string {
  return hash(dialogue.map(d => `${d.speaker}:${d.text}`).join('|'));
}

export function getCachedAudio(dialogue: DialogueTurn[]): string | null {
  const key = `audio_${getAudioKey(dialogue)}`;
  const candidates = [
    { ext: "wav", mime: "audio/wav" },
    { ext: "mp3", mime: "audio/mpeg" },
  ];

  for (const candidate of candidates) {
    const filePath = join(CACHE_DIR, `${key}.${candidate.ext}`);

    if (!existsSync(filePath)) {
      continue;
    }

    if (isExpired(filePath)) {
      console.log(`[Cache] EXPIRED - audio`);
      return null;
    }

    try {
      const buffer = readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const sizeKB = Math.round(buffer.length / 1024);
      console.log(`[Cache] HIT - audio (${sizeKB} KB from ${key}.${candidate.ext})`);
      return `data:${candidate.mime};base64,${base64}`;
    } catch (err) {
      console.error(`[Cache] Error reading audio:`, err);
      return null;
    }
  }

  console.log(`[Cache] MISS - audio`);
  return null;
}

export function setCachedAudio(dialogue: DialogueTurn[], audioDataUrl: string): void {
  ensureCacheDir();
  const key = `audio_${getAudioKey(dialogue)}`;
  try {
    const match = audioDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid audio data URL");
    }
    const mime = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    const ext = mime === "audio/wav" ? "wav" : "mp3";
    const filePath = join(CACHE_DIR, `${key}.${ext}`);
    writeFileSync(filePath, buffer);
    const sizeKB = Math.round(buffer.length / 1024);
    console.log(`[Cache] WRITE - ${key}.${ext} (${sizeKB} KB)`);
  } catch (err) {
    console.error(`[Cache] Error writing audio:`, err);
  }
}

// Episode metadata storage (for history sidebar)
export interface EpisodeMetadata {
  id: string;
  interests: string[];
  createdAt: string;
  duration: number;
  newsCount: number;
  dialogueTurns: number;
}

export function saveEpisodeMetadata(
  audioKey: string,
  interests: string[],
  duration: number,
  newsCount: number,
  dialogueTurns: number
): void {
  ensureCacheDir();
  const metadata: EpisodeMetadata = {
    id: audioKey,
    interests,
    createdAt: new Date().toISOString(),
    duration,
    newsCount,
    dialogueTurns,
  };
  const filePath = join(CACHE_DIR, `episode_${audioKey}.json`);
  writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`[Cache] WRITE - episode metadata for ${audioKey}`);
}

export function listEpisodes(): EpisodeMetadata[] {
  ensureCacheDir();

  try {
    const files = readdirSync(CACHE_DIR);
    const episodes: EpisodeMetadata[] = [];

    for (const file of files) {
      if (file.startsWith('episode_') && file.endsWith('.json')) {
        const filePath = join(CACHE_DIR, file);
        // Check if corresponding audio file exists
        const audioId = file.replace('episode_', '').replace('.json', '');
        const audioPath = join(CACHE_DIR, `audio_${audioId}.mp3`);

        if (existsSync(audioPath)) {
          try {
            const data = readFileSync(filePath, 'utf-8');
            episodes.push(JSON.parse(data));
          } catch {
            // Skip invalid files
          }
        }
      }
    }

    // Sort by date, newest first
    episodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return episodes;
  } catch {
    return [];
  }
}

export function getEpisodeAudio(episodeId: string): string | null {
  const filePath = join(CACHE_DIR, `audio_${episodeId}.mp3`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const buffer = readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return `data:audio/mpeg;base64,${base64}`;
  } catch {
    return null;
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
