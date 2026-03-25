import type { RawItem } from '@/types';

const HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search';

interface HNHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  story_text: string | null;
}

export async function fetchHackerNews(): Promise<RawItem[]> {
  const queries = [
    'AI',
    'LLM',
    'Claude',
    'GPT',
    'machine learning',
  ];

  const results = await Promise.allSettled(
    queries.map((q) => searchHN(q)),
  );

  const seen = new Set<string>();
  const items: RawItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seen.has(item.externalId)) {
          seen.add(item.externalId);
          items.push(item);
        }
      }
    } else {
      console.warn(`[hackernews] search failed:`, result.reason);
    }
  }

  return items;
}

async function searchHN(query: string): Promise<RawItem[]> {
  const since = Math.floor(Date.now() / 1000) - 86400; // last 24h
  const params = new URLSearchParams({
    query,
    tags: 'story',
    numericFilters: `created_at_i>${since}`,
    hitsPerPage: '20',
  });

  const res = await fetch(`${HN_SEARCH_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`HN Algolia: ${res.status}`);
  }

  const data = await res.json();
  const hits: HNHit[] = data.hits ?? [];

  return hits
    .filter((h) => h.title)
    .map((hit) => ({
      id: `hackernews:${hit.objectID}`,
      source: 'hackernews' as const,
      externalId: hit.objectID,
      title: hit.title!,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      body: hit.story_text?.slice(0, 1000) ?? undefined,
      author: hit.author,
      score: hit.points ?? undefined,
      commentCount: hit.num_comments ?? undefined,
      publishedAt: hit.created_at,
    }));
}
