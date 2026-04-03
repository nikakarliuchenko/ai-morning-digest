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
  return {
    title: `AI Morning Digest — ${date}`,
    description: `AI news digest for ${date}.`,
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
