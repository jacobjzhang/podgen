'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

interface Source {
  title: string;
  url: string;
  snippet?: string;
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

export default function EpisodeContent({ episode }: { episode: EpisodeData }) {
  const { setCurrentEpisode, showTranscript, setShowTranscript } = useApp();

  // Parse transcript into dialogue turns
  const dialogueTurns = episode.transcriptText
    ? episode.transcriptText.split('\n').filter(Boolean).map(line => {
        const match = line.match(/^(\w+):\s*(.*)$/);
        if (match) {
          return { speaker: match[1].toLowerCase() as 'alex' | 'jordan', text: match[2] };
        }
        return { speaker: 'alex' as const, text: line };
      })
    : [];

  // Set episode in context when component mounts
  useEffect(() => {
    setCurrentEpisode({
      id: episode.id,
      audioUrl: episode.audioSrc,
      title: episode.title,
      interests: episode.interests,
      dialogue: dialogueTurns,
    });
  }, [episode.id, episode.audioSrc, episode.title, episode.interests, dialogueTurns, setCurrentEpisode]);

  return (
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
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:bg-[var(--accent-hover)] transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Generate a new episode
        </Link>
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
  );
}
