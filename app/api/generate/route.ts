// POST /api/generate - Generate podcast episode from interests
import { NextResponse } from 'next/server';
import { fetchNewsForInterests } from '@/lib/dataforseo';
import { generateDialogue, estimateDuration } from '@/lib/openai';
import { generateAudioDataUrl } from '@/lib/elevenlabs';
import { GenerateRequest, GenerateResponse } from '@/lib/types';
import {
  getCachedNews,
  setCachedNews,
  getCachedDialogue,
  setCachedDialogue,
  getCachedAudio,
  setCachedAudio,
  logCacheStats,
} from '@/lib/cache';

export const maxDuration = 300; // 5 minute timeout for audio generation

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { interests } = body;

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: 'interests array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (interests.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 interests allowed' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Generate] Starting podcast generation for: ${interests.join(', ')}`);
    console.log(`${'='.repeat(60)}`);
    logCacheStats();

    // Step 1: Fetch news (with cache)
    console.log('\n[Generate] Step 1: Fetching news...');
    let newsItems = getCachedNews(interests);

    if (!newsItems) {
      newsItems = await fetchNewsForInterests(interests, 3);
      if (newsItems.length > 0) {
        setCachedNews(interests, newsItems);
      }
    }

    if (newsItems.length === 0) {
      return NextResponse.json(
        { error: 'No news found for the selected interests. Try different topics.' },
        { status: 404 }
      );
    }

    console.log(`[Generate] Using ${newsItems.length} news items`);

    // Step 2: Generate dialogue (with cache)
    console.log('\n[Generate] Step 2: Generating dialogue...');
    let dialogue = getCachedDialogue(newsItems);

    if (!dialogue) {
      dialogue = await generateDialogue(newsItems);
      setCachedDialogue(newsItems, dialogue);
    }

    const duration = estimateDuration(dialogue);
    console.log(`[Generate] Using ${dialogue.length} dialogue turns (~${duration}s)`);

    // Step 3: Generate audio (with cache)
    console.log('\n[Generate] Step 3: Generating audio...');
    let audioUrl = getCachedAudio(dialogue);

    if (!audioUrl) {
      audioUrl = await generateAudioDataUrl(dialogue);
      setCachedAudio(dialogue, audioUrl);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('[Generate] SUCCESS - Podcast generation complete!');
    console.log(`${'='.repeat(60)}\n`);

    const response: GenerateResponse = {
      audioUrl,
      dialogue,
      newsItems,
      duration,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('\n[Generate] ERROR:', error);

    // Provide more specific error messages
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('DATAFORSEO')) {
      return NextResponse.json(
        { error: 'Failed to fetch news. Please check DataForSEO credentials.' },
        { status: 503 }
      );
    }

    if (message.includes('OPENAI')) {
      return NextResponse.json(
        { error: 'Failed to generate dialogue. Please check OpenAI credentials.' },
        { status: 503 }
      );
    }

    if (message.includes('ELEVENLABS')) {
      return NextResponse.json(
        { error: 'Failed to generate audio. Please check ElevenLabs credentials.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
