// GET /api/episodes - List all past episodes
// GET /api/episodes?id=xxx - Get audio for specific episode

import { NextResponse } from 'next/server';
import { listEpisodes, getEpisodeAudio } from '@/lib/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get('id');

  // If ID provided, return audio for that episode
  if (episodeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('episodes')
        .select('id,audio_cache_key,audio_url')
        .or(`id.eq.${episodeId},audio_cache_key.eq.${episodeId}`)
        .limit(1)
        .maybeSingle();

      if (!error && data?.audio_url) {
        return NextResponse.json({ audioUrl: data.audio_url });
      }

      if (!error && data?.audio_cache_key) {
        const cachedAudio = getEpisodeAudio(data.audio_cache_key);
        if (cachedAudio) {
          return NextResponse.json({ audioUrl: cachedAudio });
        }
      }
    } catch (err) {
      console.error('[Episodes] Supabase lookup failed:', err);
    }

    const audioUrl = getEpisodeAudio(episodeId);

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioUrl });
  }

  // Otherwise, list all episodes
  try {
    const { data, error } = await supabaseAdmin
      .from('episodes')
      .select('id,audio_cache_key,input_summary,created_at,audio_duration_seconds,news_count,dialogue_turns')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const episodes = data.map((row) => ({
        id: row.audio_cache_key || row.id,
        interests: row.input_summary
          ? row.input_summary
              .split(',')
              .map((item: string) => item.trim())
              .filter(Boolean)
          : [],
        createdAt: row.created_at,
        duration: row.audio_duration_seconds || 0,
        newsCount: row.news_count || 0,
        dialogueTurns: row.dialogue_turns || 0,
      }));
      return NextResponse.json({ episodes });
    }
  } catch (err) {
    console.error('[Episodes] Supabase list failed:', err);
  }

  const episodes = listEpisodes();
  return NextResponse.json({ episodes });
}
