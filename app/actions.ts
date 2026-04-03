'use server';

import { addSubscriber } from '@/lib/supabase/queries';
import { sendConfirmationEmail } from '@/lib/email';

export async function subscribe(
  _prev: { message: string; ok: boolean },
  formData: FormData,
): Promise<{ message: string; ok: boolean }> {
  const email = formData.get('email');

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { message: 'Please enter a valid email address.', ok: false };
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const { confirmToken } = await addSubscriber(normalizedEmail);
    await sendConfirmationEmail(normalizedEmail, confirmToken);
    return { message: 'Check your inbox — we sent you a confirmation email.', ok: true };
  } catch {
    return { message: 'Something went wrong. Please try again.', ok: false };
  }
}
