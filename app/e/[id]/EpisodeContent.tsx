'use client';

import { useEffect, useMemo } from 'react';
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

// Speaker colors for visual distinction
const speakerColors: Record<string, { bg: string; text: string; border: string }> = {
  alex: { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/30' },
  jordan: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  casey: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  riley: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
};

const defaultColor = { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border)]' };

export default function EpisodeContent({ episode }: { episode: EpisodeData }) {
  const { setCurrentEpisode } = useApp();

  // Parse transcript into dialogue turns
  const dialogueTurns = useMemo(() => {
    if (!episode.transcriptText) return [];
    return episode.transcriptText.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        return { speaker: match[1].toLowerCase(), text: match[2] };
      }
      return { speaker: 'narrator', text: line };
    });
  }, [episode.transcriptText]);

  // Set episode in context when component mounts
  useEffect(() => {
    setCurrentEpisode({
      id: episode.id,
      audioUrl: episode.audioSrc,
      title: episode.title,
      interests: episode.interests,
      dialogue: dialogueTurns.map(t => ({
        speaker: t.speaker as 'alex' | 'jordan',
        text: t.text
      })),
    });
  }, [episode.id, episode.audioSrc, episode.title, episode.interests, dialogueTurns, setCurrentEpisode]);

  const getSpeakerColor = (speaker: string) => speakerColors[speaker] || defaultColor;

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

      {/* Transcript - Always visible on episode page */}
      {dialogueTurns.length > 0 && (
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 md:mb-6">
            Transcript
          </h3>
          <div className="space-y-4">
            {dialogueTurns.map((turn, i) => {
              const color = getSpeakerColor(turn.speaker);
              const speakerName = turn.speaker.charAt(0).toUpperCase() + turn.speaker.slice(1);

              return (
                <div
                  key={i}
                  className={`relative pl-4 border-l-2 ${color.border}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${color.bg} ${color.text}`}>
                      {speakerName.charAt(0)}
                    </span>
                    <span className={`text-sm font-semibold ${color.text}`}>
                      {speakerName}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed pl-9">
                    {turn.text}
                  </p>
                </div>
              );
            })}
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
