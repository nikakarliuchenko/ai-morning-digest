import type { Metadata } from 'next';
import { unsubscribeByEmail } from '@/lib/supabase/queries';

export const metadata: Metadata = {
  title: 'Unsubscribe – AI Morning Digest',
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  let message = 'No email address provided.';

  if (email) {
    try {
      await unsubscribeByEmail(email);
      message = "You've been unsubscribed. You won't receive any more digest emails.";
    } catch {
      message = 'Something went wrong. Please try again later.';
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        AI Morning Digest
      </h1>
      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {message}
      </p>
      <a
        href="/"
        className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Back to digest
      </a>
    </div>
  );
}
