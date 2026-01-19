'use client';

import { useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import PlayerBar from '@/components/PlayerBar';
import EpisodeHistory from '@/components/EpisodeHistory';

interface AppShellProps {
  children: ReactNode;
  headerContent?: ReactNode;
}

export default function AppShell({ children, headerContent }: AppShellProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    currentEpisode,
    showTranscript,
    toggleTranscript,
    historyKey,
  } = useApp();

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSidebarOpen(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  const handleBackdropClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
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
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Podgen</h1>
                  <p className="text-xs text-[var(--text-muted)]">AI Podcasts</p>
                </div>
              </Link>
            </div>

            {/* History section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Recent Episodes
                </h2>
                <EpisodeHistory
                  key={historyKey}
                  currentEpisodeId={currentEpisode?.id}
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
                onClick={toggleSidebar}
                className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {headerContent || (
                currentEpisode?.interests && (
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {currentEpisode.interests.slice(0, 3).map((interest, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] whitespace-nowrap">
                        {interest}
                      </span>
                    ))}
                    {currentEpisode.interests.length > 3 && (
                      <span className="text-xs text-[var(--text-muted)]">+{currentEpisode.interests.length - 3}</span>
                    )}
                  </div>
                )
              )}
            </div>
          </header>

          {children}
        </main>
      </div>

      {/* Player bar */}
      <PlayerBar
        audioUrl={currentEpisode?.audioUrl || null}
        dialogue={currentEpisode?.dialogue || []}
        episodeTitle={currentEpisode?.title || "The Daily Pulse"}
        episodeSubtitle={currentEpisode?.interests?.slice(0, 2).join(', ')}
        onTranscriptToggle={toggleTranscript}
        showTranscript={showTranscript}
      />
    </div>
  );
}
