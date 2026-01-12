'use client';

import { useState, useRef, useEffect } from 'react';
import { DialogueTurn } from '@/lib/types';

interface PodcastPlayerProps {
  audioUrl: string;
  dialogue: DialogueTurn[];
  duration?: number;
}

export default function PodcastPlayer({ audioUrl, dialogue, duration }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `podcast-${new Date().toISOString().split('T')[0]}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">The Daily Pulse</h3>
          <p className="text-indigo-200 text-sm">Generated just now</p>
        </div>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-white/10 rounded-lg transition"
          title="Download episode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* Waveform visualization placeholder */}
      <div className="h-16 mb-4 flex items-center justify-center gap-1">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all ${
              isPlaying ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`,
              backgroundColor: currentTime / audioDuration > i / 40 ? '#818cf8' : '#4338ca',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={audioDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
        />
        <div className="flex justify-between text-xs text-indigo-300 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime -= 15;
          }}
          className="p-2 hover:bg-white/10 rounded-full transition"
          title="Rewind 15s"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 bg-white text-indigo-900 rounded-full flex items-center justify-center hover:bg-indigo-100 transition shadow-lg"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime += 15;
          }}
          className="p-2 hover:bg-white/10 rounded-full transition"
          title="Forward 15s"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>
      </div>

      {/* Transcript toggle */}
      <div className="mt-6">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-sm text-indigo-300 hover:text-white flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showTranscript ? 'Hide' : 'Show'} Transcript
        </button>

        {showTranscript && (
          <div className="mt-4 max-h-64 overflow-y-auto bg-black/20 rounded-lg p-4 space-y-3">
            {dialogue.map((turn, i) => (
              <div key={i} className="text-sm">
                <span className={`font-semibold ${turn.speaker === 'alex' ? 'text-indigo-300' : 'text-purple-300'}`}>
                  {turn.speaker === 'alex' ? 'Alex' : 'Jordan'}:
                </span>{' '}
                <span className="text-gray-200">{turn.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
