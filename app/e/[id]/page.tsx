import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import EpisodeContent from './EpisodeContent';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseInterests(inputSummary: string | null | undefined): string[] {
  if (!inputSummary) return [];
  return inputSummary
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const CACHE_DIR = path.join(process.cwd(), '.cache');

function hash(data: string) {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getCacheEpisode(id: string) {
  const filePath = path.join(CACHE_DIR, `episode_${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return {
    id,
    audio_cache_key: id,
    title: raw.interests?.join(', ') || 'Untitled Episode',
    excerpt: null,
    input_summary: raw.interests?.join(', ') || null,
    audio_url: null,
    audio_duration_seconds: raw.duration || null,
    created_at: raw.createdAt || null,
  };
}

function getCacheSources(interests: string[]) {
  if (!interests || interests.length === 0) return [];
  const newsKey = `news_${hash([...interests].sort().join(','))}.json`;
  const newsPath = path.join(CACHE_DIR, newsKey);
  if (!fs.existsSync(newsPath)) return [];
  try {
    const items = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));
    return items.map((item: { title: string; url: string; snippet: string }) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      source_type: 'news',
    }));
  } catch {
    return [];
  }
}

function getTranscriptFromCache(audioKey: string) {
  if (!fs.existsSync(CACHE_DIR)) return '';
  const files = fs.readdirSync(CACHE_DIR);
  const dialogueFiles = files.filter(
    (file) => file.startsWith('dialogue_') && file.endsWith('.json')
  );

  for (const file of dialogueFiles) {
    const fp = path.join(CACHE_DIR, file);
    try {
      const dialogue = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      const key = hash(
        dialogue.map((turn: { speaker: string; text: string }) => `${turn.speaker}:${turn.text}`).join('|')
      );
      if (key === audioKey) {
        return dialogue
          .map((turn: { speaker: string; text: string }) => `${String(turn.speaker).toUpperCase()}: ${turn.text}`)
          .join('\n');
      }
    } catch {
      // ignore
    }
  }
  return '';
}

async function getEpisode(id: string) {
  const baseQuery = supabaseAdmin
    .from('episodes')
    .select(
      'id,audio_cache_key,title,excerpt,input_summary,audio_url,audio_duration_seconds,created_at'
    )
    .limit(1);

  const query = isUuid(id)
    ? baseQuery.or(`id.eq.${id},audio_cache_key.eq.${id}`)
    : baseQuery.eq('audio_cache_key', id);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return getCacheEpisode(id);
  }
  return data;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const episode = await getEpisode(id);
  if (!episode) return {};

  return {
    title: episode.title || 'Podgen Episode',
    description: episode.excerpt || episode.input_summary || 'Listen to this episode.',
    openGraph: {
      title: episode.title || 'Podgen Episode',
      description: episode.excerpt || episode.input_summary || '',
      type: 'article',
    },
  };
}

export default async function EpisodePage({ params }: PageProps) {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) {
    notFound();
  }

  const [sourcesRes, transcriptRes] = await Promise.all([
    supabaseAdmin
      .from('episode_sources')
      .select('title,url,snippet,source_type')
      .eq('episode_id', episode.id),
    supabaseAdmin
      .from('episode_transcripts')
      .select('transcript_text')
      .eq('episode_id', episode.id)
      .maybeSingle(),
  ]);

  const interests = parseInterests(episode.input_summary);
  const sources = sourcesRes.data?.length ? sourcesRes.data : getCacheSources(interests);
  const transcriptText =
    transcriptRes.data?.transcript_text ||
    getTranscriptFromCache(episode.audio_cache_key || episode.id);

  const audioSrc =
    episode.audio_url ||
    `/api/episodes?id=${episode.audio_cache_key || episode.id}`;

  const duration = formatDuration(episode.audio_duration_seconds);

  return (
    <EpisodeContent
      episode={{
        id: episode.id,
        title: episode.title || 'Untitled Episode',
        excerpt: episode.excerpt || undefined,
        interests,
        duration,
        audioSrc,
        sources: sources.map((s: { title: string; url: string; snippet?: string; source_type?: string }) => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
        })),
        transcriptText,
      }}
    />
  );
}
