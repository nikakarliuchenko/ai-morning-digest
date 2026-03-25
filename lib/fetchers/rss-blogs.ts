import { XMLParser } from 'fast-xml-parser';
import type { RawItem, Source } from '@/types';

interface FeedConfig {
  source: Source;
  url: string;
  label: string;
}

const FEEDS: FeedConfig[] = [
  {
    source: 'rss_anthropic',
    url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    label: 'Anthropic',
  },
  {
    source: 'rss_openai',
    url: 'https://openai.com/blog/rss.xml',
    label: 'OpenAI',
  },
  {
    source: 'rss_deepmind',
    url: 'https://deepmind.google/blog/rss.xml',
    label: 'DeepMind',
  },
];

const parser = new XMLParser({ ignoreAttributes: false });

export async function fetchRSSBlogs(): Promise<RawItem[]> {
  const items: RawItem[] = [];

  const results = await Promise.allSettled(
    FEEDS.map((feed) => fetchFeed(feed)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.warn(`[rss-blogs] feed fetch failed:`, result.reason);
    }
  }

  return items;
}

async function fetchFeed(config: FeedConfig): Promise<RawItem[]> {
  const res = await fetch(config.url, {
    headers: { 'User-Agent': 'ai-morning-digest/1.0' },
  });

  if (!res.ok) {
    throw new Error(`RSS ${config.label}: ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Handle both RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>)
  const rssItems = parsed?.rss?.channel?.item;
  const atomEntries = parsed?.feed?.entry;
  const entries = rssItems ?? atomEntries;

  if (!entries) return [];

  const list = Array.isArray(entries) ? entries : [entries];
  const cutoff = Date.now() - 48 * 60 * 60 * 1000; // last 48h

  return list
    .map((entry: Record<string, unknown>) => parseEntry(entry, config))
    .filter((item): item is RawItem => {
      if (!item) return false;
      return new Date(item.publishedAt).getTime() > cutoff;
    });
}

function parseEntry(
  entry: Record<string, unknown>,
  config: FeedConfig,
): RawItem | null {
  const title = getString(entry.title);
  if (!title) return null;

  const link = extractLink(entry);
  if (!link) return null;

  const published =
    getString(entry.pubDate) ??
    getString(entry.published) ??
    getString(entry.updated) ??
    new Date().toISOString();

  const body =
    getString(entry.description) ??
    getString(entry.summary) ??
    getString(entry.content);

  const slug = link.split('/').filter(Boolean).pop() ?? title.slice(0, 40);

  return {
    id: `${config.source}:${slug}`,
    source: config.source,
    externalId: slug,
    title,
    url: link,
    body: body?.slice(0, 1000) ?? undefined,
    author: config.label,
    publishedAt: published,
  };
}

function extractLink(entry: Record<string, unknown>): string | null {
  // RSS 2.0: <link> is a string
  if (typeof entry.link === 'string') return entry.link;

  // Atom: <link href="...">
  const link = entry.link as Record<string, string> | undefined;
  if (link?.['@_href']) return link['@_href'];

  // Atom: multiple <link> elements
  if (Array.isArray(entry.link)) {
    const alt = (entry.link as Record<string, string>[]).find(
      (l) => l['@_rel'] === 'alternate' || !l['@_rel'],
    );
    if (alt?.['@_href']) return alt['@_href'];
  }

  return getString(entry.guid) ?? null;
}

function getString(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const text = (val as Record<string, unknown>)['#text'];
    if (typeof text === 'string') return text;
  }
  return undefined;
}
