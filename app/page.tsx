import type { Metadata } from 'next';
import { getLatestDigest, getAllDigestDates } from '@/lib/supabase/queries';
import { SubscribeForm } from './subscribe-form';
import { DigestContent } from './digest-content';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const result = await getLatestDigest();
  if (!result) {
    return {
      title: 'AI Morning Digest',
      description: 'Daily AI news scored and curated by Claude.',
    };
  }

  const { digest, items } = result;
  const title = `AI Morning Digest – ${digest.date}`;
  const description = `Daily AI news scored and curated by Claude. ${items.length} items from Reddit, Hacker News, X, and tech blogs.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: 'https://digest.fieldnotes-ai.com',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function DigestPage() {
  const [result, dates] = await Promise.all([
    getLatestDigest(),
    getAllDigestDates(),
  ]);

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
  const idx = dates.indexOf(digest.date);
  const prevDate = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;

  return (
    <DigestContent
      digest={digest}
      items={items}
      prevDate={prevDate}
      nextDate={null}
    />
  );
}
