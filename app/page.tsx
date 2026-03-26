import type { Metadata } from 'next';
import { getLatestDigest } from '@/lib/supabase/queries';
import type { DigestItemRow } from '@/types';
import { SubscribeForm } from './subscribe-form';

export const metadata: Metadata = {
  title: 'AI Morning Digest',
  description: 'Daily AI news scored by relevance and public interest.',
};

const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  hackernews: 'HN',
  twitter: 'X',
  exa: 'Exa',
  rss_anthropic: 'Anthropic',
  rss_openai: 'OpenAI',
  rss_deepmind: 'DeepMind',
};

const SOURCE_COLORS: Record<string, string> = {
  reddit: 'bg-orange-500',
  hackernews: 'bg-orange-600',
  twitter: 'bg-blue-500',
  exa: 'bg-indigo-500',
  rss_anthropic: 'bg-amber-600',
  rss_openai: 'bg-emerald-600',
  rss_deepmind: 'bg-blue-600',
};

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const color =
    value >= 8
      ? 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950'
      : value >= 6
        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
        : 'text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800';

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {label} {value}
    </span>
  );
}

function DigestItem({ item }: { item: DigestItemRow }) {
  const srcLabel = SOURCE_LABELS[item.source] ?? item.source;
  const srcColor = SOURCE_COLORS[item.source] ?? 'bg-zinc-500';

  return (
    <div className="border-b border-zinc-100 py-4 last:border-b-0 dark:border-zinc-800">
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${srcColor}`}
        >
          {srcLabel}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-[15px] font-semibold leading-snug text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
        >
          {item.title}
        </a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ScoreBadge value={item.public_interest} label="public" />
        {item.author && (
          <span className="text-xs text-zinc-400">{item.author}</span>
        )}
        {item.source_score !== null && (
          <span className="text-xs text-zinc-400">{item.source_score} pts</span>
        )}
        {item.comment_count !== null && (
          <span className="text-xs text-zinc-400">
            {item.comment_count} comments
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {(() => {
          const text = item.public_rationale ?? item.scoring_rationale;
          return text.length > 120 ? text.slice(0, 120) + '\u2026' : text;
        })()}
      </p>
    </div>
  );
}

export default async function DigestPage() {
  const result = await getLatestDigest();

  if (!result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          AI Morning Digest
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          No digest yet. The first one will appear after the pipeline runs.
        </p>
        <div className="mt-8 w-full max-w-md">
          <SubscribeForm />
        </div>
      </div>
    );
  }

  const { digest, items } = result;

  const filtered = items.filter((i) => i.author !== 'ClaudeAI-mod-bot');

  const highlights = filtered
    .filter((i) => i.public_interest >= 8)
    .sort((a, b) => b.public_interest - a.public_interest)
    .slice(0, 10);

  const notable = filtered
    .filter((i) => i.public_interest >= 6 && i.public_interest < 8)
    .sort((a, b) => b.public_interest - a.public_interest)
    .reduce<DigestItemRow[]>((acc, item) => {
      const count = acc.filter((a) => a.source === item.source).length;
      if (count < 2) acc.push(item);
      return acc;
    }, [])
    .slice(0, 15);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            AI Morning Digest
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {digest.date} &middot; {digest.item_count} items scored
          </p>
        </header>

        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          AI-curated news from Reddit, Hacker News, X, and tech blogs — scored daily by Claude.
        </p>

        {highlights.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
              Highlights
            </h2>
            {highlights.map((item) => (
              <DigestItem key={item.id} item={item} />
            ))}
          </section>
        )}

        {notable.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
              Notable
            </h2>
            {notable.map((item) => (
              <DigestItem key={item.id} item={item} />
            ))}
          </section>
        )}

        <SubscribeForm />

        <footer className="mt-8 text-center text-xs text-zinc-400">
          Scored with Claude Haiku &middot; Sources: Reddit, HN, X, Exa, tech
          blogs
        </footer>
      </main>
    </div>
  );
}
