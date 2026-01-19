'use client';

import { useState, useRef, useEffect } from 'react';
import { DialogueTurn } from '@/lib/types';

interface PlayerBarProps {
  audioUrl: string | null;
  dialogue: DialogueTurn[];
  episodeTitle?: string;
  episodeSubtitle?: string;
  onTranscriptToggle?: () => void;
  showTranscript?: boolean;
}

export default function PlayerBar({
  audioUrl,
  dialogue,
  episodeTitle = "The Daily Pulse",
  episodeSubtitle,
  onTranscriptToggle,
  showTranscript,
}: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Reset state and attach event listeners when audioUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Reset state for new audio
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Auto-play when new audio loads
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-center z-50">
        <p className="text-[var(--text-muted)] text-sm">Select topics and generate an episode to start listening</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[var(--bg-secondary)] border-t border-[var(--border)] z-50">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Progress bar at top of player */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg-elevated)] group cursor-pointer">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="h-full px-4 flex items-center gap-6">
        {/* Episode info - left */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="w-14 h-14 rounded bg-gradient-to-br from-[var(--accent)] to-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{episodeTitle}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{episodeSubtitle || 'AI Generated Podcast'}</p>
          </div>
        </div>

        {/* Controls - center */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl">
          <div className="flex items-center gap-4">
            {/* Skip back */}
            <button
              onClick={() => skip(-15)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Back 15s"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skip(15)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Forward 15s"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <span>/</span>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 w-64 justify-end">
          {/* Speed */}
          <button
            onClick={() => {
              const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
              const currentIndex = speeds.indexOf(playbackSpeed);
              const nextIndex = (currentIndex + 1) % speeds.length;
              setPlaybackSpeed(speeds[nextIndex]);
            }}
            className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded hover:border-[var(--text-muted)] transition"
          >
            {playbackSpeed}x
          </button>

          {/* Transcript toggle */}
          {dialogue.length > 0 && (
            <button
              onClick={onTranscriptToggle}
              className={`p-2 rounded transition ${showTranscript ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Toggle transcript"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 accent-[var(--accent)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
