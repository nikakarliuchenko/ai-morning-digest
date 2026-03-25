import type { RawItem } from '@/types';

const SOCIALDATA_URL = 'https://api.socialdata.tools/twitter/search';

interface Tweet {
  id_str: string;
  full_text: string;
  user: { screen_name: string };
  retweet_count: number;
  favorite_count: number;
  tweet_created_at: string;
}

export async function fetchTwitter(): Promise<RawItem[]> {
  const apiKey = process.env.SOCIALDATA_API_KEY;
  if (!apiKey) {
    console.warn('[twitter] SOCIALDATA_API_KEY not set, skipping');
    return [];
  }

  const queries = [
    'Claude Code -is:retweet min_faves:5',
    'MCP server Claude -is:retweet min_faves:5',
    'headless CMS AI -is:retweet min_faves:10',
    'Next.js AI -is:retweet min_faves:10',
    'Anthropic announcement -is:retweet min_faves:20',
    'AI developer tool launch -is:retweet min_faves:30',
  ];

  const results = await Promise.allSettled(
    queries.map((q) => searchTweets(apiKey, q)),
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
      console.warn(`[twitter] search failed:`, result.reason);
    }
  }

  return items;
}

async function searchTweets(
  apiKey: string,
  query: string,
): Promise<RawItem[]> {
  const params = new URLSearchParams({ query, type: 'Latest' });
  const res = await fetch(`${SOCIALDATA_URL}?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`SocialData: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const tweets: Tweet[] = data.tweets ?? [];

  return tweets.filter((tweet) => tweet.id_str && tweet.full_text).map((tweet) => ({
    id: `twitter:${tweet.id_str}`,
    source: 'twitter' as const,
    externalId: tweet.id_str,
    title: tweet.full_text.slice(0, 120),
    url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    body: tweet.full_text,
    author: tweet.user.screen_name,
    score: tweet.favorite_count,
    commentCount: tweet.retweet_count,
    publishedAt: safeDateParse(tweet.tweet_created_at),
  }));
}

function safeDateParse(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Twitter format: "Mon Mar 24 12:00:00 +0000 2026"
  const parts = dateStr.split(' ');
  if (parts.length >= 6) {
    const reordered = `${parts[1]} ${parts[2]}, ${parts[5]} ${parts[3]} ${parts[4]}`;
    const d2 = new Date(reordered);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  return new Date().toISOString();
}
