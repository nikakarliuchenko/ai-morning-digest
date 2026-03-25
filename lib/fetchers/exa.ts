import type { RawItem } from '@/types';

const EXA_URL = 'https://api.exa.ai/search';

interface ExaResult {
  id: string;
  url: string;
  title: string;
  author?: string;
  publishedDate?: string;
  text?: string;
  score?: number;
}

export async function fetchExa(): Promise<RawItem[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.warn('[exa] EXA_API_KEY not set, skipping');
    return [];
  }

  const queries = [
    'new AI coding tools and developer workflows this week',
    'Anthropic Claude new features announcements',
    'emerging MCP servers and agentic AI tools',
    'headless CMS AI integration tutorials',
    'Next.js new features and AI integration',
  ];

  const results = await Promise.allSettled(
    queries.map((q) => searchExa(apiKey, q)),
  );

  const seen = new Set<string>();
  const items: RawItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          items.push(item);
        }
      }
    } else {
      console.warn(`[exa] search failed:`, result.reason);
    }
  }

  return items;
}

async function searchExa(
  apiKey: string,
  query: string,
): Promise<RawItem[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const res = await fetch(EXA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      type: 'neural',
      useAutoprompt: true,
      numResults: 10,
      startPublishedDate: oneDayAgo,
      contents: { text: { maxCharacters: 1000 } },
    }),
  });

  if (!res.ok) {
    throw new Error(`Exa: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const results: ExaResult[] = data.results ?? [];

  const cutoff = Date.now() - 48 * 60 * 60 * 1000; // 48h buffer

  return results
    .filter((r) => {
      if (!r.publishedDate) return true; // keep if unknown, scorer will handle
      return new Date(r.publishedDate).getTime() >= cutoff;
    })
    .map((r) => {
      const slug = r.url.split('/').filter(Boolean).pop() ?? r.id;

      return {
        id: `exa:${slug}`,
        source: 'exa' as const,
        externalId: slug,
        title: r.title || r.url,
        url: r.url,
        body: r.text?.slice(0, 1000) ?? undefined,
        author: r.author ?? undefined,
        publishedAt: r.publishedDate ?? new Date().toISOString(),
        metadata: { exaScore: r.score },
      };
    });
}
