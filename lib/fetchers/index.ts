import type { RawItem } from '@/types';
import { fetchReddit } from './reddit';
import { fetchHackerNews } from './hackernews';
import { fetchRSSBlogs } from './rss-blogs';
import { fetchTwitter } from './socialdata';
import { fetchExa } from './exa';

export async function fetchAllSources(): Promise<RawItem[]> {
  const results = await Promise.allSettled([
    fetchReddit(),
    fetchHackerNews(),
    fetchRSSBlogs(),
    fetchTwitter(),
    fetchExa(),
  ]);

  const all: RawItem[] = [];
  const sourceNames = ['reddit', 'hackernews', 'rss-blogs', 'twitter', 'exa'];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[fetchers] ${sourceNames[i]}: ${result.value.length} items`);
      all.push(...result.value);
    } else {
      console.error(`[fetchers] ${sourceNames[i]} failed:`, result.reason);
    }
  });

  const deduped = deduplicateByUrl(all);
  const capped = deduped.slice(0, 150);
  console.log(`[fetchers] total: ${all.length} raw → ${deduped.length} deduped → ${capped.length} capped`);

  return capped;
}

function deduplicateByUrl(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  const result: RawItem[] = [];

  for (const item of items) {
    const normalized = normalizeUrl(item.url);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }

  return result;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('ref');
    return u.toString().replace(/\/+$/, '');
  } catch {
    return url;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  fetchAllSources().then((items) => {
    console.log(`Total items: ${items.length}`);
    const bySrc = items.reduce((acc, i) => { acc[i.source] = (acc[i.source] || 0) + 1; return acc; }, {} as Record<string, number>);
    console.table(bySrc);
  }).catch(console.error);
}
