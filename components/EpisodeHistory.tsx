'use client';

import { useState, useEffect } from 'react';

interface Episode {
  id: string;
  interests: string[];
  createdAt: string;
  duration: number;
  newsCount: number;
  dialogueTurns: number;
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
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading history...
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <p>No episodes yet</p>
        <p className="text-xs mt-1">Generate your first podcast!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {episodes.map((episode) => (
        <button
          key={episode.id}
          onClick={() => handlePlayEpisode(episode)}
          disabled={loadingId === episode.id}
          className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
            currentEpisodeId === episode.id ? 'bg-indigo-50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              currentEpisodeId === episode.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {loadingId === episode.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {episode.interests.slice(0, 2).map((interest, i) => (
                  <span
                    key={i}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                  >
                    {interest}
                  </span>
                ))}
                {episode.interests.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{episode.interests.length - 2}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{formatDuration(episode.duration)}</span>
                <span>·</span>
                <span>{formatDate(episode.createdAt)}</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Export for refreshing the list from parent
export function useEpisodeRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);
  return { refreshKey, refresh };
}
