import { XMLParser } from 'fast-xml-parser';
import type { RawItem } from '@/types';

const SUBREDDITS = [
  'ClaudeAI',
  'ClaudeCode',
  'nextjs',
  'webdev',
  'artificial',
];

const parser = new XMLParser({
  ignoreAttributes: false,
  htmlEntities: true,
  processEntities: false,
});

export async function fetchReddit(): Promise<RawItem[]> {
  const items: RawItem[] = [];

  const results = await Promise.allSettled(
    SUBREDDITS.map((sub) => fetchSubreddit(sub)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.warn(`[reddit] subreddit fetch failed:`, result.reason);
    }
  }

  return items;
}

async function fetchSubreddit(subreddit: string): Promise<RawItem[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.rss?limit=25`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ai-morning-digest/1.0' },
  });

  if (!res.ok) {
    throw new Error(`Reddit RSS ${subreddit}: ${res.status}`);
  }

  const xml = await res.text();
  const feed = parser.parse(xml);
  const entries = feed?.feed?.entry;
  if (!entries) return [];

  const items: RawItem[] = (Array.isArray(entries) ? entries : [entries]).map(
    (entry: Record<string, unknown>) => {
      const id = String(entry.id ?? '');
      const externalId = id.split('/').pop() ?? id;

      return {
        id: `reddit:${externalId}`,
        source: 'reddit' as const,
        externalId,
        title: String(entry.title ?? ''),
        url: String(
          (entry.link as Record<string, string>)?.['@_href'] ?? entry.id ?? '',
        ),
        body: extractText(entry.content ?? entry.summary),
        author: extractAuthor(entry.author),
        publishedAt: String(entry.updated ?? entry.published ?? new Date().toISOString()),
        subreddit,
        metadata: { subreddit },
      };
    },
  );

  return items;
}

function extractText(content: unknown): string | undefined {
  if (!content) return undefined;
  if (typeof content === 'string') return content.slice(0, 1000);
  if (typeof content === 'object' && content !== null) {
    const text = (content as Record<string, unknown>)['#text'];
    if (typeof text === 'string') return text.slice(0, 1000);
  }
  return undefined;
}

function extractAuthor(author: unknown): string | undefined {
  if (!author) return undefined;
  if (typeof author === 'string') return author;
  if (typeof author === 'object' && author !== null) {
    const name = (author as Record<string, unknown>).name;
    if (typeof name === 'string') return name;
    const uri = (author as Record<string, unknown>).uri;
    if (typeof uri === 'string') return uri.split('/').pop();
  }
  return undefined;
}
