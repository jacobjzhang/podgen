// Shared types for the podcast generation pipeline

export interface NewsItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt?: string;
  // Enriched field (populated by GPT-5-nano summarization)
  detailedSummary?: string;
}

export interface TrendData {
  keyword: string;
  interest: number; // 0-100 relative interest
  relatedTopics: string[];
}

export interface DialogueTurn {
  speaker: 'alex' | 'jordan' | 'casey' | 'riley';
  text: string;
}

export interface GenerateRequest {
  interests: string[];
  speakerCount?: number;
}

export interface GenerateResponse {
  audioUrl: string;
  dialogue: DialogueTurn[];
  newsItems: NewsItem[];
  duration?: number;
}

export interface Interest {
  id: string;
  label: string;
  category: string;
}
