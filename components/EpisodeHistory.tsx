'use client';

import { useState, useEffect } from 'react';

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
  onSelectEpisode: (audioUrl: string, episode: Episode) => void;
  currentEpisodeId?: string;
}

export default function EpisodeHistory({ onSelectEpisode, currentEpisodeId }: EpisodeHistoryProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const handlePlayEpisode = async (episode: Episode) => {
    setLoadingId(episode.id);
    try {
      const response = await fetch(`/api/episodes?id=${episode.id}`);
      const data = await response.json();

      if (data.audioUrl) {
        onSelectEpisode(data.audioUrl, episode);
      }
    } catch (error) {
      console.error('Failed to load episode:', error);
    } finally {
      setLoadingId(null);
    }
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
        const isLoading = loadingId === episode.id;

        return (
          <button
            key={episode.id}
            onClick={() => handlePlayEpisode(episode)}
            disabled={isLoading}
            className={`w-full p-3 rounded-lg text-left transition-all group ${
              isCurrent
                ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30'
                : 'hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                isCurrent
                  ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-elevated)] group-hover:text-[var(--text-secondary)]'
              }`}>
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
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
                      className={`text-xs px-2 py-0.5 rounded ${
                        isCurrent
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
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
