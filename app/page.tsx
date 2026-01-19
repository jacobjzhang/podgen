'use client';

import { useState, useCallback } from 'react';
import InterestPicker from '@/components/InterestPicker';
import GenerateButton from '@/components/GenerateButton';
import PodcastPlayer from '@/components/PodcastPlayer';
import EpisodeHistory from '@/components/EpisodeHistory';
import { Interest, DialogueTurn, NewsItem } from '@/lib/types';

type GenerationStep = 'idle' | 'fetching' | 'writing' | 'speaking' | 'done' | 'error';

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: '',
  fetching: 'Fetching latest news...',
  writing: 'Writing dialogue...',
  speaking: 'Generating audio...',
  done: '',
  error: 'Something went wrong',
};

interface GeneratedEpisode {
  audioUrl: string;
  dialogue: DialogueTurn[];
  newsItems: NewsItem[];
  duration?: number;
  id?: string;
  interests?: string[];
}

export default function Home() {
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [episode, setEpisode] = useState<GeneratedEpisode | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [speakerCount, setSpeakerCount] = useState(2);

  const handleGenerate = async () => {
    if (selectedInterests.length === 0) return;

    setError(null);
    setEpisode(null);

    try {
      setGenerationStep('fetching');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: selectedInterests.map(i => i.label),
          speakerCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate podcast');
      }

      const data = await response.json();

      setEpisode({
        audioUrl: data.audioUrl,
        dialogue: data.dialogue,
        newsItems: data.newsItems,
        duration: data.duration,
        interests: selectedInterests.map(i => i.label),
      });
      setGenerationStep('done');

      // Refresh history to show new episode
      setHistoryKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setGenerationStep('error');
    }
  };

  const handleSelectEpisode = useCallback((audioUrl: string, episodeData: { id: string; interests: string[]; duration: number }) => {
    setEpisode({
      audioUrl,
      dialogue: [],
      newsItems: [],
      duration: episodeData.duration,
      id: episodeData.id,
      interests: episodeData.interests,
    });
    setGenerationStep('done');
    setError(null);
  }, []);

  const isGenerating = ['fetching', 'writing', 'speaking'].includes(generationStep);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 border-r bg-white transition-all duration-300 overflow-hidden`}>
        <div className="w-72 h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Episode History</h2>
            <p className="text-xs text-gray-500 mt-1">Previously generated podcasts</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <EpisodeHistory
              key={historyKey}
              onSelectEpisode={handleSelectEpisode}
              currentEpisodeId={episode?.id}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarOpen ? 'Hide history' : 'Show history'}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Podgen</h1>
                <p className="text-sm text-gray-500">AI-powered on-demand podcasts</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
          {/* Hero section */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Your Personal News Podcast
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select topics you care about and we&apos;ll generate a podcast episode
              discussing the latest news - instantly.
            </p>
          </div>

          {/* Interest picker section */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What topics interest you?
            </h3>
            <InterestPicker
              selectedInterests={selectedInterests}
              onSelectionChange={setSelectedInterests}
              maxSelections={5}
              disabled={isGenerating}
            />
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="speakerCount">
                Number of speakers
              </label>
              <select
                id="speakerCount"
                value={speakerCount}
                onChange={(e) => setSpeakerCount(parseInt(e.target.value, 10))}
                disabled={isGenerating}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              >
                <option value={1}>1 speaker</option>
                <option value={2}>2 speakers</option>
                <option value={3}>3 speakers</option>
                <option value={4}>4 speakers</option>
              </select>
            </div>
          </div>

          {/* Generate button */}
          <div className="mb-8">
            <GenerateButton
              onClick={handleGenerate}
              disabled={selectedInterests.length === 0}
              isLoading={isGenerating}
              loadingStep={STEP_MESSAGES[generationStep]}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-800">Generation failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generated episode */}
          {episode && (
            <div className="space-y-6">
              {/* Show interests for historical episodes */}
              {episode.interests && episode.interests.length > 0 && !episode.newsItems?.length && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">Topics:</span>
                  {episode.interests.map((interest, i) => (
                    <span key={i} className="text-sm px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">
                      {interest}
                    </span>
                  ))}
                </div>
              )}

              <PodcastPlayer
                audioUrl={episode.audioUrl}
                dialogue={episode.dialogue}
                duration={episode.duration}
              />

              {/* News sources (only for newly generated episodes) */}
              {episode.newsItems && episode.newsItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Sources discussed
                  </h3>
                  <div className="space-y-3">
                    {episode.newsItems.map((item, i) => (
                      <a
                        key={i}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <p className="font-medium text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.snippet}</p>
                        <p className="text-xs text-indigo-600 mt-2">{item.source}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state hint */}
          {!episode && !isGenerating && selectedInterests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-gray-500">
                Select some topics above to generate your personalized podcast
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
            Powered by DataForSEO, OpenAI GPT-5.2, and ElevenLabs
          </div>
        </footer>
      </div>
    </div>
  );
}
