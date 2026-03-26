'use server';

import { addSubscriber } from '@/lib/supabase/queries';

export async function subscribe(
  _prev: { message: string; ok: boolean },
  formData: FormData,
): Promise<{ message: string; ok: boolean }> {
  const email = formData.get('email');

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { message: 'Please enter a valid email address.', ok: false };
  }

  try {
    await addSubscriber(email.trim().toLowerCase());
    return { message: 'Subscribed! You'll receive your first digest tomorrow morning.', ok: true };
  } catch {
    return { message: 'Something went wrong. Please try again.', ok: false };
  }
}
