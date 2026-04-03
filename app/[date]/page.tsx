import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDigestByDate, getAllDigestDates } from '@/lib/supabase/queries';
import { DigestContent } from '../digest-content';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const result = await getDigestByDate(date);

  const itemCount = result?.items.length ?? 0;
  const title = `AI Morning Digest – ${date}`;
  const description = itemCount > 0
    ? `Daily AI news scored and curated by Claude. ${itemCount} items from Reddit, Hacker News, X, and tech blogs.`
    : `AI news digest for ${date}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://digest.fieldnotes-ai.com/${date}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function DateDigestPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!DATE_RE.test(date)) notFound();

  const [result, dates] = await Promise.all([
    getDigestByDate(date),
    getAllDigestDates(),
  ]);

  if (!result) notFound();

  const { digest, items } = result;
  const idx = dates.indexOf(date);
  const prevDate = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;
  const nextDate = idx > 0 ? dates[idx - 1] : null;

  return (
    <DigestContent
      digest={digest}
      items={items}
      prevDate={prevDate}
      nextDate={nextDate}
    />
  );
}
