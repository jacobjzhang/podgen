// GET /api/trends - Fetch news for selected interests
import { NextResponse } from 'next/server';
import { fetchNewsForInterests } from '@/lib/dataforseo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interestsParam = searchParams.get('interests');

  if (!interestsParam) {
    return NextResponse.json(
      { error: 'interests parameter is required' },
      { status: 400 }
    );
  }

  const interests = interestsParam.split(',').map(i => i.trim()).filter(Boolean);

  if (interests.length === 0) {
    return NextResponse.json(
      { error: 'At least one interest is required' },
      { status: 400 }
    );
  }

  if (interests.length > 5) {
    return NextResponse.json(
      { error: 'Maximum 5 interests allowed' },
      { status: 400 }
    );
  }

  try {
    const newsItems = await fetchNewsForInterests(interests, 3);

    return NextResponse.json({
      interests,
      newsItems,
      count: newsItems.length,
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
