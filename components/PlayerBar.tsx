'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!audioUrl) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayRef.current?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(m => !m);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioUrl]);

  // Ref to avoid stale closure in keyboard handler
  const togglePlayRef = useRef<(() => void) | null>(null);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [audioUrl, isPlaying]);

  // Keep ref in sync for keyboard handler
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  }, [togglePlay]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  }, [duration]);

  // Handle progress bar hover for time preview
  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(percentage * duration);
    setHoverPosition(x);
  };

  const handleProgressLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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
      <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-center z-50 px-4">
        <p className="text-[var(--text-muted)] text-sm text-center">Select topics and generate an episode to start listening</p>
      </div>
    );
  }

  const keyboardHints = [
    { key: 'Space', action: 'Play/Pause' },
    { key: '←/→', action: 'Skip 5s' },
    { key: 'M', action: 'Mute' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[var(--bg-secondary)] border-t border-[var(--border)] z-50">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Progress bar at top of player */}
      <div
        ref={progressBarRef}
        className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg-elevated)] group cursor-pointer hover:h-2 transition-all duration-150"
        onMouseMove={handleProgressHover}
        onMouseLeave={handleProgressLeave}
        onClick={handleProgressClick}
      >
        {/* Progress fill */}
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
        {/* Hover preview line */}
        {hoverTime !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/50 pointer-events-none"
            style={{ left: `${(hoverTime / duration) * 100}%` }}
          />
        )}
        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--accent)] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
        {/* Time preview tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs font-medium pointer-events-none transform -translate-x-1/2 shadow-lg"
            style={{ left: hoverPosition }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Seek"
        />
      </div>

      <div className="h-full px-3 md:px-4 flex items-center gap-3 md:gap-6">
        {/* Episode info - left (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-3 w-48 lg:w-64 min-w-0">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded bg-gradient-to-br from-[var(--accent)] to-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{episodeTitle}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{episodeSubtitle || 'AI Generated Podcast'}</p>
          </div>
        </div>

        {/* Controls - center (takes more space on mobile) */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Skip back */}
            <button
              onClick={() => skip(-15)}
              className="p-1.5 md:p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all cursor-pointer"
              title="Back 15s (← for 5s)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
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
              className="p-1.5 md:p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all cursor-pointer"
              title="Forward 15s (→ for 5s)"
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
        <div className="flex items-center gap-2 md:gap-3 sm:w-48 lg:w-64 justify-end">
          {/* Speed */}
          <button
            onClick={() => {
              const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
              const currentIndex = speeds.indexOf(playbackSpeed);
              const nextIndex = (currentIndex + 1) % speeds.length;
              setPlaybackSpeed(speeds[nextIndex]);
            }}
            className="px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md transition-all cursor-pointer"
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>

          {/* Transcript toggle */}
          {dialogue.length > 0 && (
            <button
              onClick={onTranscriptToggle}
              className={`hidden sm:block p-2 rounded-lg transition-all cursor-pointer ${showTranscript ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              title="Toggle transcript"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Volume (hidden on mobile - use system volume) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
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
