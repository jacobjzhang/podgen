// GET /api/episodes - List all past episodes
// GET /api/episodes?id=xxx - Get audio for specific episode

import { NextResponse } from 'next/server';
import { listEpisodes, getEpisodeAudio } from '@/lib/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get('id');

  // If ID provided, return audio for that episode
  if (episodeId) {
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
  const episodes = listEpisodes();
  return NextResponse.json({ episodes });
}
