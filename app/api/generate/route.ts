// POST /api/generate - Generate podcast episode from interests
import { NextResponse } from 'next/server';
import { fetchNewsForInterests } from '@/lib/dataforseo';
import { enrichNewsItems } from '@/lib/article-enricher';
import { generateDialogue, estimateDuration, generateEpisodeMetadata } from '@/lib/openai';
import { generateAudioDataUrl, getCurrentProvider } from '@/lib/tts';
import { CustomInput, GenerateRequest, GenerateResponse, NewsItem } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getCachedNews,
  setCachedNews,
  getCachedEnrichedNews,
  setCachedEnrichedNews,
  getCachedDialogue,
  setCachedDialogue,
  getCachedAudio,
  setCachedAudio,
  getAudioKey,
  saveEpisodeMetadata,
  logCacheStats,
} from '@/lib/cache';

export const maxDuration = 300; // 5 minute timeout for audio generation

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { interests } = body;
    const speakerCount = body.speakerCount ?? 3;
    const customInputs: CustomInput[] = Array.isArray(body.customInputs)
      ? body.customInputs.filter(
          input =>
            input &&
            (input.type === 'url' || input.type === 'prompt') &&
            typeof input.value === 'string' &&
            input.value.trim().length > 0
        )
      : [];

    if (!interests || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'interests must be an array' },
        { status: 400 }
      );
    }

    const totalTopics = interests.length + customInputs.length;

    if (totalTopics === 0) {
      return NextResponse.json(
        { error: 'Provide at least one interest, URL, or prompt' },
        { status: 400 }
      );
    }

    if (totalTopics > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 total topics allowed' },
        { status: 400 }
      );
    }

    if (speakerCount < 1 || speakerCount > 4) {
      return NextResponse.json(
        { error: 'speakerCount must be between 1 and 4' },
        { status: 400 }
      );
    }

    const provider = getCurrentProvider();
    if (
      speakerCount > 2 &&
      provider !== 'vibevoice' &&
      provider !== 'vibevoice-fal'
    ) {
      return NextResponse.json(
        { error: 'speakerCount > 2 requires a VibeVoice provider' },
        { status: 400 }
      );
    }

    const totalStart = Date.now();
    const timings: Record<string, number> = {};

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Generate] Starting podcast generation for: ${interests.join(', ')}`);
    console.log(`${'='.repeat(60)}`);
    logCacheStats();

    // Step 1: Fetch news (with cache)
    console.log('\n[Generate] Step 1: Fetching news...');
    let newsItems: NewsItem[] = [];
    let stepStart = Date.now();

    if (interests.length > 0) {
      const cached = getCachedNews(interests);
      if (!cached) {
        newsItems = await fetchNewsForInterests(interests, 3);
        if (newsItems.length > 0) {
          setCachedNews(interests, newsItems);
        }
        timings.news = Date.now() - stepStart;
        console.log(`[Generate] News fetched in ${(timings.news / 1000).toFixed(1)}s`);
      } else {
        newsItems = cached;
        console.log('[Generate] News loaded from cache');
      }
    } else {
      console.log('[Generate] Skipping news fetch (no interests)');
    }

    if (customInputs.length > 0) {
      const customItems: NewsItem[] = customInputs.map((input) => {
        if (input.type === 'url') {
          return {
            title: 'User-provided URL',
            snippet: `User provided URL: ${input.value}`,
            url: input.value,
            source: 'User URL',
          };
        }

        return {
          title: 'User prompt',
          snippet: input.value,
          url: '',
          source: 'User prompt',
          detailedSummary: input.value,
        };
      });

      newsItems = [...newsItems, ...customItems];
    }

    if (newsItems.length === 0) {
      return NextResponse.json(
        { error: 'No news found for the selected interests. Try different topics.' },
        { status: 404 }
      );
    }

    console.log(`[Generate] Using ${newsItems.length} news items`);

    // Step 2: Enrich news with detailed summaries (with cache)
    console.log('\n[Generate] Step 2: Enriching articles with GPT-5-nano...');
    let enrichedNews = getCachedEnrichedNews(newsItems);
    stepStart = Date.now();

    if (!enrichedNews) {
      enrichedNews = await enrichNewsItems(newsItems);
      setCachedEnrichedNews(newsItems, enrichedNews);
      timings.enrichment = Date.now() - stepStart;
      console.log(`[Generate] Enrichment completed in ${(timings.enrichment / 1000).toFixed(1)}s`);
    } else {
      console.log('[Generate] Enriched news loaded from cache');
    }

    const enrichedCount = enrichedNews.filter(n => n.detailedSummary && n.detailedSummary !== n.snippet).length;
    console.log(`[Generate] ${enrichedCount}/${enrichedNews.length} articles enriched with detailed summaries`);

    // Step 3: Generate dialogue (with cache)
    console.log('\n[Generate] Step 3: Generating dialogue...');
    let dialogue = getCachedDialogue(enrichedNews, speakerCount);
    stepStart = Date.now();

    if (!dialogue) {
      dialogue = await generateDialogue(enrichedNews, speakerCount);
      setCachedDialogue(enrichedNews, dialogue, speakerCount);
      timings.dialogue = Date.now() - stepStart;
      console.log(`[Generate] Dialogue generated in ${(timings.dialogue / 1000).toFixed(1)}s`);
    } else {
      console.log('[Generate] Dialogue loaded from cache');
    }

    const duration = estimateDuration(dialogue);
    console.log(`[Generate] Using ${dialogue.length} dialogue turns (~${duration}s estimated audio)`);

    // Step 4: Generate audio (with cache)
    console.log(`\n[Generate] Step 4: Generating audio (provider: ${getCurrentProvider()})...`);
    let audioUrl = getCachedAudio(dialogue);
    const isNewAudio = !audioUrl;
    stepStart = Date.now();

    if (!audioUrl) {
      audioUrl = await generateAudioDataUrl(dialogue);
      setCachedAudio(dialogue, audioUrl);
      timings.audio = Date.now() - stepStart;
      console.log(`[Generate] Audio generated in ${(timings.audio / 1000).toFixed(1)}s`);
    } else {
      console.log('[Generate] Audio loaded from cache');
    }

    const audioKey = getAudioKey(dialogue);

    // Save episode metadata for history sidebar
    if (isNewAudio) {
      saveEpisodeMetadata(audioKey, interests, duration, enrichedNews.length, dialogue.length);
    }

    const inputSummary = [
      ...interests,
      ...customInputs.map(input => input.value),
    ].filter(Boolean).join(', ');

    const generatedMeta = await generateEpisodeMetadata(enrichedNews, dialogue, inputSummary);
    const title = generatedMeta?.title || inputSummary || 'Untitled Episode';
    const excerpt = generatedMeta?.excerpt || null;

    const transcriptText = dialogue
      .map((turn) => `${String(turn.speaker).toUpperCase()}: ${turn.text}`)
      .join('\n');

    const audioFormat = audioUrl.startsWith('data:')
      ? audioUrl.match(/^data:([^;]+);/)?.[1] || null
      : audioUrl.endsWith('.wav')
      ? 'audio/wav'
      : audioUrl.endsWith('.mp3')
      ? 'audio/mpeg'
      : null;

    const audioUrlForDb = audioUrl.startsWith('data:') ? null : audioUrl;

    try {
      const { data: episodeRow, error: episodeError } = await supabaseAdmin
        .from('episodes')
        .upsert({
          audio_cache_key: audioKey,
          owner_user_id: null,
          title,
          excerpt,
          audio_url: audioUrlForDb,
          audio_format: audioFormat,
          audio_duration_seconds: duration || null,
          tts_provider: getCurrentProvider(),
          speaker_count: speakerCount,
          status: 'ready',
          public: false,
          share_slug: null,
          input_summary: inputSummary || null,
          news_count: enrichedNews.length,
          dialogue_turns: dialogue.length,
        }, { onConflict: 'audio_cache_key' })
        .select('id')
        .single();

      if (episodeError) {
        console.error('[Generate] Supabase episode upsert failed:', episodeError);
      } else if (episodeRow?.id) {
        const sources = enrichedNews.map((item) => {
          const sourceType =
            item.source === 'User URL'
              ? 'url'
              : item.source === 'User prompt'
              ? 'prompt'
              : 'news';
          return {
            episode_id: episodeRow.id,
            source_type: sourceType,
            title: item.title,
            url: item.url || null,
            snippet: item.snippet,
            detailed_summary: item.detailedSummary || item.snippet,
          };
        });

        if (sources.length > 0) {
          const { error: sourcesError } = await supabaseAdmin
            .from('episode_sources')
            .insert(sources);
          if (sourcesError) {
            console.error('[Generate] Supabase sources insert failed:', sourcesError);
          }
        }

        const { error: transcriptError } = await supabaseAdmin
          .from('episode_transcripts')
          .upsert({
            episode_id: episodeRow.id,
            dialogue_json: dialogue,
            transcript_text: transcriptText,
          });
        if (transcriptError) {
          console.error('[Generate] Supabase transcript upsert failed:', transcriptError);
        }
      }
    } catch (err) {
      console.error('[Generate] Supabase write failed:', err);
    }

    const totalTime = Date.now() - totalStart;
    console.log(`\n${'='.repeat(60)}`);
    console.log('[Generate] SUCCESS - Podcast generation complete!');
    console.log(`[Generate] Total time: ${(totalTime / 1000).toFixed(1)}s`);
    if (Object.keys(timings).length > 0) {
      console.log(`[Generate] Breakdown: ${Object.entries(timings).map(([k, v]) => `${k}=${(v / 1000).toFixed(1)}s`).join(', ')}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    const response: GenerateResponse = {
      audioUrl,
      dialogue,
      newsItems: enrichedNews,
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
