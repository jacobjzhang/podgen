'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Episode {
  id: string;
  interests: string[];
  createdAt: string;
  duration: number;
  newsCount: number;
  dialogueTurns: number;
  title?: string;
  excerpt?: string;
}

interface EpisodeHistoryProps {
  currentEpisodeId?: string;
}

export default function EpisodeHistory({ currentEpisodeId }: EpisodeHistoryProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const response = await fetch('/api/episodes');
      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEpisode = (episode: Episode) => {
    router.push(`/e/${episode.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
        <p className="text-[var(--text-muted)] text-sm mt-3">Loading...</p>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <p className="text-[var(--text-muted)] text-sm">No episodes yet</p>
        <p className="text-[var(--text-muted)]/60 text-xs mt-1">Generate your first podcast</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {episodes.map((episode) => {
        const isCurrent = currentEpisodeId === episode.id;
        return (
          <button
            key={episode.id}
            onClick={() => handleOpenEpisode(episode)}
            className={`w-full p-3 rounded-lg text-left transition-all duration-200 group cursor-pointer ${
              isCurrent
                ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30 shadow-sm shadow-[var(--accent)]/10'
                : 'hover:bg-[var(--bg-hover)] hover:translate-x-1 border border-transparent hover:border-[var(--border)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                isCurrent
                  ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-md shadow-[var(--accent)]/30'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] group-hover:shadow-md group-hover:shadow-[var(--accent)]/20'
              }`}>
                {/* Play icon - shows on hover when not current */}
                <svg className={`w-4 h-4 transition-transform duration-200 ${!isCurrent ? 'group-hover:scale-110' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {/* Now playing indicator */}
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--bg-secondary)] animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate transition-colors duration-200 ${
                  isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                }`}>
                  {episode.title || episode.interests.join(', ') || 'Untitled Episode'}
                </p>
                {episode.excerpt && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
                    {episode.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {episode.interests.slice(0, 2).map((interest, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded transition-colors duration-200 ${
                        isCurrent
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)]/80'
                      }`}
                    >
                      {interest}
                    </span>
                  ))}
                  {episode.interests.length > 2 && (
                    <span className="text-xs text-[var(--text-muted)]">
                      +{episode.interests.length - 2}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]">
                  <span>{formatDuration(episode.duration)}</span>
                  <span className="opacity-50">·</span>
                  <span>{formatDate(episode.createdAt)}</span>
                </div>
              </div>
              {/* Hover arrow indicator */}
              <svg className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0 mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Export for refreshing the list from parent
export function useEpisodeRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);
  return { refreshKey, refresh };
}
