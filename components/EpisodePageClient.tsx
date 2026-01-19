'use client';

import { useState, useEffect } from 'react';
import PlayerBar from '@/components/PlayerBar';
import EpisodeHistory from '@/components/EpisodeHistory';

interface Source {
  title: string;
  url: string;
  snippet?: string;
  source_type?: string;
}

interface EpisodeData {
  id: string;
  title: string;
  excerpt?: string;
  interests: string[];
  duration: string;
  audioSrc: string;
  sources: Source[];
  transcriptText: string;
}

export default function EpisodePageClient({ episode }: { episode: EpisodeData }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 768);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackdropClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Parse transcript into dialogue turns for display
  const dialogueTurns = episode.transcriptText
    ? episode.transcriptText.split('\n').filter(Boolean).map(line => {
        const match = line.match(/^(\w+):\s*(.*)$/);
        if (match) {
          return { speaker: match[1].toLowerCase(), text: match[2] };
        }
        return { speaker: 'unknown', text: line };
      })
    : [];

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
              <a href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Podgen</h1>
                  <p className="text-xs text-[var(--text-muted)]">AI Podcasts</p>
                </div>
              </a>
            </div>

            {/* History section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Recent Episodes
                </h2>
                <EpisodeHistory currentEpisodeId={episode.id} />
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
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
            {/* Episode header */}
            <div className="mb-8 md:mb-10">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Episode
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-3 leading-tight">
                {episode.title}
              </h2>
              {episode.excerpt && (
                <p className="text-base md:text-lg text-[var(--text-secondary)]">
                  {episode.excerpt}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {episode.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
                >
                  {interest}
                </span>
              ))}
              {episode.duration && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  {episode.duration}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="mb-10">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:bg-[var(--accent-hover)] transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Generate a new episode
              </a>
            </div>

            {/* Transcript panel */}
            {showTranscript && dialogueTurns.length > 0 && (
              <div className="mb-8 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
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
                  {dialogueTurns.map((turn, i) => (
                    <div key={i} className="text-sm">
                      <span className={`font-semibold ${turn.speaker === 'alex' ? 'text-[var(--accent)]' : 'text-purple-400'}`}>
                        {turn.speaker.charAt(0).toUpperCase() + turn.speaker.slice(1)}:
                      </span>{' '}
                      <span className="text-[var(--text-secondary)]">{turn.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {episode.sources.length > 0 && (
              <div className="mb-10">
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 md:mb-4">
                  Sources
                </h3>
                <div className="grid gap-3">
                  {episode.sources.map((source, idx) => (
                    <a
                      key={`${source.url || source.title}-${idx}`}
                      href={source.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 md:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] transition group"
                    >
                      <p className="font-medium text-sm group-hover:text-[var(--accent)] transition line-clamp-1">
                        {source.title || 'Source'}
                      </p>
                      {source.snippet && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                          {source.snippet}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Player bar */}
      <PlayerBar
        audioUrl={episode.audioSrc}
        dialogue={dialogueTurns.map(t => ({ speaker: t.speaker as 'alex' | 'jordan', text: t.text }))}
        episodeTitle={episode.title}
        episodeSubtitle={episode.interests.slice(0, 2).join(', ')}
        onTranscriptToggle={() => setShowTranscript(!showTranscript)}
        showTranscript={showTranscript}
      />
    </div>
  );
}
