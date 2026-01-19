'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DialogueTurn } from '@/lib/types';

interface Episode {
  id?: string;
  audioUrl: string;
  title: string;
  interests: string[];
  dialogue: DialogueTurn[];
  duration?: number;
}

interface AppContextType {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Episode/Player
  currentEpisode: Episode | null;
  setCurrentEpisode: (episode: Episode | null) => void;

  // Transcript
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
  toggleTranscript: () => void;

  // History refresh trigger
  historyKey: number;
  refreshHistory: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const toggleTranscript = useCallback(() => setShowTranscript(prev => !prev), []);
  const refreshHistory = useCallback(() => setHistoryKey(prev => prev + 1), []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        currentEpisode,
        setCurrentEpisode,
        showTranscript,
        setShowTranscript,
        toggleTranscript,
        historyKey,
        refreshHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
