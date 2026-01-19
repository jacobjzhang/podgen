'use client';

import { useState, useEffect } from 'react';
import InterestPicker from '@/components/InterestPicker';
import PlayerBar from '@/components/PlayerBar';
import EpisodeHistory from '@/components/EpisodeHistory';
import { Interest, DialogueTurn, NewsItem } from '@/lib/types';

type GenerationStep = 'idle' | 'fetching' | 'writing' | 'speaking' | 'done' | 'error';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(3);

  // Close sidebar on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, sidebar can stay open
      } else {
        // On mobile, close sidebar by default
        setSidebarOpen(false);
      }
    };

    // Set initial state
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 768);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedInterests.length === 0) return;

    setError(null);
    setEpisode(null);
    setShowTranscript(false);

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

      setEpisode({
        audioUrl: data.audioUrl,
        dialogue: data.dialogue,
        newsItems: data.newsItems,
        duration: data.duration,
        interests: selectedInterests.map(i => i.label),
      });
      setGenerationStep('done');
      setHistoryKey(k => k + 1);
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
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={handleBackdropClick}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-30
            w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--border)]
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-0'}
            md:transition-all
          `}
        >
          <div className="w-[280px] h-full flex flex-col">
            {/* Logo */}
            <div className="p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Podgen</h1>
                  <p className="text-xs text-[var(--text-muted)]">AI Podcasts</p>
                </div>
              </div>
            </div>

            {/* History section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Recent Episodes
                </h2>
                <EpisodeHistory
                  key={historyKey}
                  currentEpisodeId={episode?.id}
                />
              </div>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-[var(--player-height)]">
          {/* Header bar */}
          <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {episode?.interests && (
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {episode.interests.slice(0, 3).map((interest, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] whitespace-nowrap">
                      {interest}
                    </span>
                  ))}
                  {episode.interests.length > 3 && (
                    <span className="text-xs text-[var(--text-muted)]">+{episode.interests.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </header>

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

            {/* Interest picker */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
                Select Topics
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
                    className={`py-2 rounded-lg text-sm font-medium transition ${
                      speakerCount === count
                        ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    } ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                3-4 speakers require VibeVoice.
              </p>
            </div>

            {/* Generate button */}
            <div className="mb-8 md:mb-10">
              <button
                onClick={handleGenerate}
                disabled={selectedInterests.length === 0 || isGenerating}
                className={`
                  w-full py-3.5 md:py-4 px-6 rounded-xl font-medium text-base transition-all
                  ${selectedInterests.length === 0 || isGenerating
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] active:scale-[0.99]'
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
                  `Generate Episode${selectedInterests.length > 0 ? ` · ${selectedInterests.length} topic${selectedInterests.length > 1 ? 's' : ''}` : ''}`
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 md:mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Transcript panel */}
            {showTranscript && episode?.dialogue && episode.dialogue.length > 0 && (
              <div className="mb-6 md:mb-8 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 md:px-5 py-3 md:py-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-medium">Transcript</h3>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 md:p-5 max-h-80 md:max-h-96 overflow-y-auto space-y-3 md:space-y-4">
                  {episode.dialogue.map((turn, i) => (
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
            {episode?.newsItems && episode.newsItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
                  Sources
                </h3>
                <div className="grid gap-3">
                  {episode.newsItems.map((item, i) => (
                    <a
                      key={i}
                      href={item.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 md:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] transition group"
                    >
                      <p className="font-medium text-sm group-hover:text-[var(--accent)] transition line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {item.snippet}
                      </p>
                      <p className="text-xs text-[var(--accent-muted)] mt-2">
                        {item.source}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!episode && !isGenerating && selectedInterests.length === 0 && (
              <div className="text-center py-12 md:py-16">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <p className="text-[var(--text-muted)]">
                  Select topics above to generate your podcast
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Player bar */}
      <PlayerBar
        audioUrl={episode?.audioUrl || null}
        dialogue={episode?.dialogue || []}
        episodeTitle="The Daily Pulse"
        episodeSubtitle={episode?.interests?.slice(0, 2).join(', ')}
        onTranscriptToggle={() => setShowTranscript(!showTranscript)}
        showTranscript={showTranscript}
      />
    </div>
  );
}
