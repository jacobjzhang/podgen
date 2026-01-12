'use client';

import { useState } from 'react';
import InterestPicker from '@/components/InterestPicker';
import GenerateButton from '@/components/GenerateButton';
import PodcastPlayer from '@/components/PodcastPlayer';
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
}

export default function Home() {
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [episode, setEpisode] = useState<GeneratedEpisode | null>(null);

  const handleGenerate = async () => {
    if (selectedInterests.length === 0) return;

    setError(null);
    setEpisode(null);

    try {
      // Simulate step progression (actual API handles all steps)
      setGenerationStep('fetching');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: selectedInterests.map(i => i.label),
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
      });
      setGenerationStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setGenerationStep('error');
    }
  };

  const isGenerating = ['fetching', 'writing', 'speaking'].includes(generationStep);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
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

      <main className="max-w-4xl mx-auto px-4 py-8">
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
            <PodcastPlayer
              audioUrl={episode.audioUrl}
              dialogue={episode.dialogue}
              duration={episode.duration}
            />

            {/* News sources */}
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
      <footer className="border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Powered by DataForSEO, OpenAI GPT-5.2, and ElevenLabs
        </div>
      </footer>
    </div>
  );
}
