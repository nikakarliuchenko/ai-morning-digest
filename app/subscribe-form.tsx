'use client';

import { useActionState } from 'react';
import { subscribe } from './actions';

const initial = { message: '', ok: false };

export function SubscribeForm() {
  const [state, formAction, pending] = useActionState(subscribe, initial);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Get the daily digest in your inbox
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Top AI stories, scored and curated. No spam.
      </p>
      <form action={formAction} className="mt-4 flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {state.message && (
        <p
          className={`mt-3 text-sm ${state.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
