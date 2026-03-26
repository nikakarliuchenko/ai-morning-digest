import { Resend } from 'resend';
import type { DigestItemRow } from '@/types';
import { getActiveSubscribers } from '@/lib/supabase/queries';
import { personalDigestHtml, publicDigestHtml } from './templates';

// ---- Config ----

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const YOUR_EMAIL = process.env.YOUR_EMAIL!;

// ---- Send personal digest (to you) ----

export async function sendPersonalDigest(
  date: string,
  items: DigestItemRow[],
): Promise<boolean> {
  const html = personalDigestHtml(date, items, YOUR_EMAIL);

  const { error } = await resend.emails.send({
    from: `AI Digest <${FROM}>`,
    to: YOUR_EMAIL,
    subject: `Your AI Digest - ${date}`,
    html,
  });

  if (error) {
    console.error('[email] personal digest failed:', error);
    return false;
  }

  console.log(`[email] personal digest sent to ${YOUR_EMAIL}`);
  return true;
}

// ---- Send public digest (to all subscribers) ----

export async function sendPublicDigest(
  date: string,
  items: DigestItemRow[],
): Promise<{ sent: boolean; subscriberCount: number }> {
  const subscribers = await getActiveSubscribers();

  if (subscribers.length === 0) {
    console.log('[email] no active subscribers, skipping public digest');
    return { sent: true, subscriberCount: 0 };
  }

  // Send individually so each subscriber gets their own unsubscribe link
  const results = await Promise.allSettled(
    subscribers.map((sub) => {
      const html = publicDigestHtml(date, items, sub.email);

      return resend.emails.send({
        from: `AI Morning Digest <${FROM}>`,
        to: sub.email,
        subject: `AI Morning Digest - ${date}`,
        html,
      });
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[email] ${failed.length}/${subscribers.length} public emails failed`);
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[email] public digest sent to ${succeeded}/${subscribers.length} subscribers`);

  return { sent: failed.length === 0, subscriberCount: succeeded };
}

// ---- Orchestrator: send both digests ----

export async function sendDigestEmails(
  date: string,
  items: DigestItemRow[],
): Promise<{
  personal: boolean;
  public: boolean;
  subscriberCount: number;
}> {
  const [personal, pub] = await Promise.all([
    sendPersonalDigest(date, items),
    sendPublicDigest(date, items),
  ]);

  return {
    personal,
    public: pub.sent,
    subscriberCount: pub.subscriberCount,
  };
}

// ---- Helpers ----

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// ---- Quick test: npx tsx --env-file=.env.local lib/email/index.ts ----

if (process.argv[1]?.endsWith('lib/email/index.ts')) {
  const fakeItems: DigestItemRow[] = [
    {
      id: 'test-1',
      digest_id: 'test',
      source: 'hackernews',
      external_id: '1',
      title: 'Claude 4.5 Sonnet ships with computer-use GA',
      url: 'https://anthropic.com/news/claude-4-5',
      body: null,
      author: 'dang',
      source_score: 820,
      comment_count: 314,
      published_at: new Date().toISOString(),
      personal_relevance: 9,
      public_interest: 9,
      scoring_rationale: 'Major Claude release directly impacts your daily workflow and AI features.',
      public_rationale: 'Major Claude release with computer-use GA — significant upgrade for any developer using AI assistants.',
      comment_angle: 'Share your experience migrating from 3.5 to 4.5 — real-world latency and cost comparisons get huge engagement.',
      metadata: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'test-2',
      digest_id: 'test',
      source: 'reddit',
      external_id: '2',
      title: 'Next.js 16.3 drops with built-in React Server Actions caching',
      url: 'https://nextjs.org/blog/next-16-3',
      body: null,
      author: 'timneutkens',
      source_score: 450,
      comment_count: 127,
      published_at: new Date().toISOString(),
      personal_relevance: 8,
      public_interest: 7,
      scoring_rationale: 'Directly relevant to your Next.js production stack — caching RSAs is a major DX win.',
      public_rationale: 'Next.js 16.3 adds built-in caching for React Server Actions — practical performance win for full-stack apps.',
      comment_angle: 'Post a before/after of your Contentful data-fetching with the new caching — practical examples always land well.',
      metadata: null,
      created_at: new Date().toISOString(),
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  console.log(`[test] sending personal digest for ${today} with ${fakeItems.length} fake items...`);
  sendPersonalDigest(today, fakeItems).then((ok) => {
    console.log(ok ? '[test] success!' : '[test] failed');
    process.exit(ok ? 0 : 1);
  });
}
