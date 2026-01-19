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

  // Technology (expanded)
  { id: 'ai-ethics', label: 'AI Ethics', category: 'Technology' },
  { id: 'ai-safety', label: 'AI Safety & Alignment', category: 'Technology' },
  { id: 'machine-learning', label: 'Machine Learning', category: 'Technology' },
  { id: 'data-science', label: 'Data Science', category: 'Technology' },
  { id: 'cloud-computing', label: 'Cloud Computing', category: 'Technology' },
  { id: 'devops', label: 'DevOps & Infrastructure', category: 'Technology' },
  { id: 'programming', label: 'Programming Languages', category: 'Technology' },
  { id: 'open-source', label: 'Open Source Software', category: 'Technology' },
  { id: 'quantum-computing', label: 'Quantum Computing', category: 'Technology' },
  { id: 'robotics', label: 'Robotics', category: 'Technology' },
  { id: 'ar-vr', label: 'AR & VR', category: 'Technology' },
  { id: 'iot', label: 'Internet of Things', category: 'Technology' },
  { id: 'edge-computing', label: 'Edge Computing', category: 'Technology' },
  { id: 'semiconductors', label: 'Semiconductors', category: 'Technology' },
  { id: 'telecom', label: '5G & Telecom', category: 'Technology' },
  { id: 'privacy', label: 'Digital Privacy', category: 'Technology' },
  { id: 'web3', label: 'Web3 & Blockchain', category: 'Technology' },
  { id: 'product-management', label: 'Product Management', category: 'Technology' },
  { id: 'ux-design', label: 'UX/UI Design', category: 'Technology' },
  { id: 'mobile-tech', label: 'Mobile Technology', category: 'Technology' },

  // Business (expanded)
  { id: 'corporate-earnings', label: 'Corporate Earnings', category: 'Business' },
  { id: 'mergers-acquisitions', label: 'Mergers & Acquisitions', category: 'Business' },
  { id: 'venture-capital', label: 'Venture Capital', category: 'Business' },
  { id: 'private-equity', label: 'Private Equity', category: 'Business' },
  { id: 'banking', label: 'Banking', category: 'Business' },
  { id: 'fintech', label: 'Fintech', category: 'Business' },
  { id: 'insurance', label: 'Insurance', category: 'Business' },
  { id: 'retail', label: 'Retail', category: 'Business' },
  { id: 'ecommerce', label: 'Ecommerce', category: 'Business' },
  { id: 'logistics', label: 'Logistics & Supply Chain', category: 'Business' },
  { id: 'small-business', label: 'Small Business', category: 'Business' },
  { id: 'marketing', label: 'Marketing', category: 'Business' },
  { id: 'advertising', label: 'Advertising', category: 'Business' },
  { id: 'workplace', label: 'Workplace & HR', category: 'Business' },
  { id: 'leadership', label: 'Leadership & Management', category: 'Business' },

  // Science (expanded)
  { id: 'neuroscience', label: 'Neuroscience', category: 'Science' },
  { id: 'genetics', label: 'Genetics & Genomics', category: 'Science' },
  { id: 'astronomy', label: 'Astronomy', category: 'Science' },
  { id: 'space-science', label: 'Space Science', category: 'Science' },
  { id: 'energy', label: 'Energy Science', category: 'Science' },
  { id: 'renewable-energy', label: 'Renewable Energy', category: 'Science' },
  { id: 'environmental-science', label: 'Environmental Science', category: 'Science' },
  { id: 'ocean-science', label: 'Ocean Science', category: 'Science' },
  { id: 'materials-science', label: 'Materials Science', category: 'Science' },
  { id: 'chemistry', label: 'Chemistry', category: 'Science' },
  { id: 'public-health', label: 'Public Health', category: 'Science' },
  { id: 'nutrition-science', label: 'Nutrition Science', category: 'Science' },
  { id: 'epidemiology', label: 'Epidemiology', category: 'Science' },
  { id: 'aging', label: 'Aging & Longevity', category: 'Science' },
  { id: 'psychology', label: 'Psychology', category: 'Science' },

  // Politics (expanded)
  { id: 'geopolitics', label: 'Geopolitics', category: 'Politics' },
  { id: 'national-security', label: 'National Security', category: 'Politics' },
  { id: 'defense', label: 'Defense Policy', category: 'Politics' },
  { id: 'immigration', label: 'Immigration', category: 'Politics' },
  { id: 'regulation', label: 'Regulation & Antitrust', category: 'Politics' },
  { id: 'supreme-court', label: 'Supreme Court', category: 'Politics' },
  { id: 'congress', label: 'Congress', category: 'Politics' },
  { id: 'international-relations', label: 'International Relations', category: 'Politics' },
  { id: 'human-rights', label: 'Human Rights', category: 'Politics' },
  { id: 'climate-policy', label: 'Climate Policy', category: 'Politics' },

  // Entertainment (expanded)
  { id: 'tv', label: 'Television', category: 'Entertainment' },
  { id: 'streaming-shows', label: 'Streaming Originals', category: 'Entertainment' },
  { id: 'books', label: 'Books & Publishing', category: 'Entertainment' },
  { id: 'podcasts', label: 'Podcasts', category: 'Entertainment' },
  { id: 'pop-culture', label: 'Pop Culture', category: 'Entertainment' },
  { id: 'comedy', label: 'Comedy', category: 'Entertainment' },
  { id: 'theater', label: 'Theater', category: 'Entertainment' },
  { id: 'art', label: 'Art & Museums', category: 'Entertainment' },
  { id: 'gaming-industry', label: 'Gaming Industry', category: 'Entertainment' },
  { id: 'creators', label: 'Creators & Influencers', category: 'Entertainment' },

  // Sports (expanded)
  { id: 'mlb', label: 'MLB Baseball', category: 'Sports' },
  { id: 'nhl', label: 'NHL Hockey', category: 'Sports' },
  { id: 'college-football', label: 'College Football', category: 'Sports' },
  { id: 'college-basketball', label: 'College Basketball', category: 'Sports' },
  { id: 'tennis', label: 'Tennis', category: 'Sports' },
  { id: 'golf', label: 'Golf', category: 'Sports' },
  { id: 'f1', label: 'Formula 1', category: 'Sports' },
  { id: 'mma', label: 'MMA & UFC', category: 'Sports' },
  { id: 'olympics', label: 'Olympics', category: 'Sports' },
  { id: 'cricket', label: 'Cricket', category: 'Sports' },

  // Lifestyle (expanded)
  { id: 'personal-finance', label: 'Personal Finance', category: 'Lifestyle' },
  { id: 'productivity', label: 'Productivity', category: 'Lifestyle' },
  { id: 'career', label: 'Career & Jobs', category: 'Lifestyle' },
  { id: 'education', label: 'Education', category: 'Lifestyle' },
  { id: 'parenting', label: 'Parenting', category: 'Lifestyle' },
  { id: 'relationships', label: 'Relationships', category: 'Lifestyle' },
  { id: 'home-improvement', label: 'Home Improvement', category: 'Lifestyle' },
  { id: 'interior-design', label: 'Interior Design', category: 'Lifestyle' },
  { id: 'gardening', label: 'Gardening', category: 'Lifestyle' },
  { id: 'pets', label: 'Pets', category: 'Lifestyle' },
  { id: 'outdoors', label: 'Outdoors & Hiking', category: 'Lifestyle' },
  { id: 'cooking', label: 'Cooking', category: 'Lifestyle' },
  { id: 'nutrition', label: 'Nutrition & Diet', category: 'Lifestyle' },
  { id: 'sleep', label: 'Sleep & Recovery', category: 'Lifestyle' },
  { id: 'mindfulness', label: 'Mindfulness & Meditation', category: 'Lifestyle' },
  { id: 'self-care', label: 'Self-Care', category: 'Lifestyle' },
  { id: 'beauty', label: 'Beauty & Skincare', category: 'Lifestyle' },
  { id: 'travel-deals', label: 'Travel Deals', category: 'Lifestyle' },
  { id: 'sustainable-living', label: 'Sustainable Living', category: 'Lifestyle' },
  { id: 'automobiles', label: 'Automobiles', category: 'Lifestyle' },
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

  filtered = [...filtered].sort((a, b) => a.label.localeCompare(b.label));

  const categories = [...new Set(INTERESTS.map(i => i.category))].sort((a, b) =>
    a.localeCompare(b)
  );

  return NextResponse.json({
    interests: filtered,
    categories,
  });
}
