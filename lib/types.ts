// Shared types for the podcast generation pipeline

export interface NewsItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt?: string;
  // Enriched fields (populated by GPT-5-nano summarization)
  detailedSummary?: string;
  keyDetails?: string[];
  quotes?: string[];
  numbers?: string[];
}

export interface TrendData {
  keyword: string;
  interest: number; // 0-100 relative interest
  relatedTopics: string[];
}

export interface DialogueTurn {
  speaker: 'alex' | 'jordan';
  text: string;
}

export interface GenerateRequest {
  interests: string[];
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
