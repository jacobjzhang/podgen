// GET /api/interests - Returns list of available interests for autocomplete
import { NextResponse } from 'next/server';
import { Interest } from '@/lib/types';

// Curated list of interests for MVP
// Organized by category for better UX
const INTERESTS: Interest[] = [
  // Technology
  { id: 'ai', label: 'Artificial Intelligence', category: 'Technology' },
  { id: 'crypto', label: 'Cryptocurrency', category: 'Technology' },
  { id: 'cybersecurity', label: 'Cybersecurity', category: 'Technology' },
  { id: 'startups', label: 'Tech Startups', category: 'Technology' },
  { id: 'gadgets', label: 'Gadgets & Devices', category: 'Technology' },
  { id: 'software', label: 'Software Development', category: 'Technology' },
  { id: 'gaming', label: 'Video Games', category: 'Technology' },
  { id: 'space', label: 'Space Technology', category: 'Technology' },

  // Business & Finance
  { id: 'stocks', label: 'Stock Market', category: 'Business' },
  { id: 'economy', label: 'Economy', category: 'Business' },
  { id: 'investing', label: 'Investing', category: 'Business' },
  { id: 'real-estate', label: 'Real Estate', category: 'Business' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', category: 'Business' },

  // Science & Health
  { id: 'medicine', label: 'Medical Research', category: 'Science' },
  { id: 'climate', label: 'Climate Change', category: 'Science' },
  { id: 'biotech', label: 'Biotechnology', category: 'Science' },
  { id: 'physics', label: 'Physics', category: 'Science' },
  { id: 'mental-health', label: 'Mental Health', category: 'Science' },

  // Politics & World
  { id: 'politics', label: 'US Politics', category: 'Politics' },
  { id: 'world-news', label: 'World News', category: 'Politics' },
  { id: 'elections', label: 'Elections', category: 'Politics' },
  { id: 'foreign-policy', label: 'Foreign Policy', category: 'Politics' },

  // Entertainment
  { id: 'movies', label: 'Movies', category: 'Entertainment' },
  { id: 'music', label: 'Music Industry', category: 'Entertainment' },
  { id: 'streaming', label: 'Streaming Services', category: 'Entertainment' },
  { id: 'celebrities', label: 'Celebrity News', category: 'Entertainment' },

  // Sports
  { id: 'nfl', label: 'NFL Football', category: 'Sports' },
  { id: 'nba', label: 'NBA Basketball', category: 'Sports' },
  { id: 'soccer', label: 'Soccer', category: 'Sports' },
  { id: 'esports', label: 'Esports', category: 'Sports' },

  // Lifestyle
  { id: 'fitness', label: 'Fitness & Wellness', category: 'Lifestyle' },
  { id: 'travel', label: 'Travel', category: 'Lifestyle' },
  { id: 'food', label: 'Food & Dining', category: 'Lifestyle' },
  { id: 'fashion', label: 'Fashion', category: 'Lifestyle' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase();
  const category = searchParams.get('category');

  let filtered = INTERESTS;

  // Filter by search query
  if (query) {
    filtered = filtered.filter(
      interest =>
        interest.label.toLowerCase().includes(query) ||
        interest.id.includes(query)
    );
  }

  // Filter by category
  if (category) {
    filtered = filtered.filter(interest => interest.category === category);
  }

  return NextResponse.json({
    interests: filtered,
    categories: [...new Set(INTERESTS.map(i => i.category))],
  });
}
