'use client';

import { useState } from 'react';
import InterestPicker from '@/components/InterestPicker';
import { useApp } from '@/context/AppContext';
import { Interest, NewsItem } from '@/lib/types';

type GenerationStep = 'idle' | 'fetching' | 'writing' | 'speaking' | 'done' | 'error';

// Quick-pick suggestions for instant selection
const QUICK_PICKS = [
  { id: 'ai', label: 'AI & Tech', category: 'Technology' },
  { id: 'markets', label: 'Markets', category: 'Finance' },
  { id: 'politics', label: 'Politics', category: 'News' },
  { id: 'science', label: 'Science', category: 'Science' },
  { id: 'sports', label: 'Sports', category: 'Sports' },
  { id: 'entertainment', label: 'Entertainment', category: 'Entertainment' },
];

export default function Home() {
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [speakerCount, setSpeakerCount] = useState(4);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  const { currentEpisode, setCurrentEpisode, showTranscript, setShowTranscript, refreshHistory } = useApp();

  const handleQuickPick = (pick: typeof QUICK_PICKS[0]) => {
    if (selectedInterests.some(i => i.id === pick.id)) {
      setSelectedInterests(selectedInterests.filter(i => i.id !== pick.id));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests([...selectedInterests, pick]);
    }
  };

  const handleGenerate = async () => {
    if (selectedInterests.length === 0) return;

    setError(null);
    setCurrentEpisode(null);
    setShowTranscript(false);
    setNewsItems([]);

    const customInputs = selectedInterests
      .filter(i => i.category === 'Custom')
      .map(i => ({
        type: i.id.startsWith('custom:url') ? 'url' : 'prompt',
        value: i.label,
      }));

    const interestLabels = selectedInterests
      .filter(i => i.category !== 'Custom')
      .map(i => i.label);

    try {
      setGenerationStep('fetching');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: interestLabels, customInputs, speakerCount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate podcast');
      }

      const data = await response.json();

      setCurrentEpisode({
        audioUrl: data.audioUrl,
        dialogue: data.dialogue,
        title: data.title || "The Daily Pulse",
        interests: selectedInterests.map(i => i.label),
        duration: data.duration,
      });
      setNewsItems(data.newsItems || []);
      setGenerationStep('done');
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setGenerationStep('error');
    }
  };

  const isGenerating = ['fetching', 'writing', 'speaking'].includes(generationStep);

  const getStepMessage = () => {
    switch (generationStep) {
      case 'fetching': return 'Finding the latest stories...';
      case 'writing': return 'Writing the script...';
      case 'speaking': return 'Generating audio...';
      default: return '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Hero */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 md:mb-4 leading-tight">
          Your morning briefing,<br />
          <span className="text-[var(--accent)]">generated.</span>
        </h2>
        <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl">
          Pick topics that matter to you. We&apos;ll create a podcast episode
          covering the latest developments—ready in minutes.
        </p>
      </div>

      {/* Quick picks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span className="text-sm font-medium text-[var(--text-secondary)]">Quick picks</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PICKS.map((pick) => {
            const isSelected = selectedInterests.some(i => i.id === pick.id);
            return (
              <button
                key={pick.id}
                onClick={() => handleQuickPick(pick)}
                disabled={isGenerating || (!isSelected && selectedInterests.length >= 5)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all select-none
                  ${isSelected
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/25'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }
                  ${isGenerating || (!isSelected && selectedInterests.length >= 5) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {pick.label}
                {isSelected && (
                  <span className="ml-2 opacity-70">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interest picker */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
          Or search for more
        </h3>
        <InterestPicker
          selectedInterests={selectedInterests}
          onSelectionChange={setSelectedInterests}
          maxSelections={5}
          disabled={isGenerating}
        />
      </div>

      {/* Speaker count */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
          Speakers
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setSpeakerCount(count)}
              disabled={isGenerating}
              className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                speakerCount === count
                  ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/25'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              } ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          More voices for richer conversation
        </p>
      </div>

      {/* Generate button */}
      <div className="mb-8 md:mb-10">
        <button
          onClick={handleGenerate}
          disabled={selectedInterests.length === 0 || isGenerating}
          className={`
            group w-full py-3.5 md:py-4 px-6 rounded-xl font-medium text-base transition-all
            ${selectedInterests.length === 0 || isGenerating
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] active:scale-[0.99] shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/30'
            }
          `}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {getStepMessage()}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {selectedInterests.length > 0 && (
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              )}
              {`Generate Episode${selectedInterests.length > 0 ? ` · ${selectedInterests.length} topic${selectedInterests.length > 1 ? 's' : ''}` : ''}`}
            </span>
          )}
        </button>
        {selectedInterests.length === 0 && !isGenerating && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-3">
            Select at least one topic to get started
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 md:mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-red-400 text-sm font-medium">Generation failed</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript panel */}
      {showTranscript && currentEpisode?.dialogue && currentEpisode.dialogue.length > 0 && (
        <div className="mb-6 md:mb-8 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-medium">Transcript</h3>
            <button
              onClick={() => setShowTranscript(false)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 md:p-5 max-h-80 md:max-h-96 overflow-y-auto space-y-3 md:space-y-4">
            {currentEpisode.dialogue.map((turn, i) => (
              <div key={i} className="text-sm">
                <span className={`font-semibold ${turn.speaker === 'alex' ? 'text-[var(--accent)]' : 'text-purple-400'}`}>
                  {turn.speaker === 'alex' ? 'Alex' : 'Jordan'}:
                </span>{' '}
                <span className="text-[var(--text-secondary)]">{turn.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {newsItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
            Sources
          </h3>
          <div className="grid gap-3">
            {newsItems.map((item, i) => (
              <a
                key={i}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-3 md:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-[var(--accent)] transition line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {item.snippet}
                    </p>
                    <p className="text-xs text-[var(--accent-muted)] mt-2">
                      {item.source}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state with suggestions */}
      {!currentEpisode && !isGenerating && selectedInterests.length === 0 && (
        <div className="text-center py-8 md:py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-[var(--text-primary)] font-medium mb-2">
            Ready to generate your podcast
          </p>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Use the quick picks above or search for specific topics
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)]">
              <kbd className="font-mono text-[var(--accent)]">↑</kbd>
              <kbd className="font-mono text-[var(--accent)]">↓</kbd>
              Browse topics
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)]">
              <kbd className="font-mono text-[var(--accent)]">Enter</kbd>
              Select
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
