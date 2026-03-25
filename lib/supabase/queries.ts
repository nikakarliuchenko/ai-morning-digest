import { getServiceClient } from './client';
import type { DigestRow, DigestItemRow, ScoredItem, SubscriberRow } from '@/types';

function db() {
  return getServiceClient();
}

// ---- Digests ----

export async function createDigest(date: string): Promise<DigestRow> {
  const { data, error } = await db()
    .from('digests')
    .upsert({ date, status: 'pending', item_count: 0 }, { onConflict: 'date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDigestStatus(
  id: string,
  status: DigestRow['status'],
  itemCount?: number,
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (itemCount !== undefined) update.item_count = itemCount;
  const { error } = await db().from('digests').update(update).eq('id', id);
  if (error) throw error;
}

export async function getDigestByDate(
  date: string,
): Promise<{ digest: DigestRow; items: DigestItemRow[] } | null> {
  const { data: digest, error } = await db()
    .from('digests')
    .select()
    .eq('date', date)
    .single();
  if (error || !digest) return null;

  const { data: items, error: itemsError } = await db()
    .from('digest_items')
    .select()
    .eq('digest_id', digest.id)
    .order('public_interest', { ascending: false });
  if (itemsError) throw itemsError;

  return { digest, items: items ?? [] };
}

export async function getLatestDigest(): Promise<{
  digest: DigestRow;
  items: DigestItemRow[];
} | null> {
  const { data: digest, error } = await db()
    .from('digests')
    .select()
    .eq('status', 'complete')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error || !digest) return null;

  const { data: items, error: itemsError } = await db()
    .from('digest_items')
    .select()
    .eq('digest_id', digest.id)
    .order('public_interest', { ascending: false });
  if (itemsError) throw itemsError;

  return { digest, items: items ?? [] };
}

// ---- Digest Items ----

export async function insertDigestItems(
  digestId: string,
  items: ScoredItem[],
): Promise<void> {
  const rows = items.map((item) => ({
    digest_id: digestId,
    source: item.source,
    external_id: item.externalId,
    title: item.title,
    url: item.url,
    body: item.body ?? null,
    author: item.author ?? null,
    source_score: item.score ?? null,
    comment_count: item.commentCount ?? null,
    published_at: item.publishedAt,
    personal_relevance: item.personalRelevance,
    public_interest: item.publicInterest,
    scoring_rationale: item.scoringRationale,
    comment_angle: item.commentAngle ?? null,
    metadata: item.metadata ?? null,
  }));

  const { error } = await db()
    .from('digest_items')
    .upsert(rows, { onConflict: 'digest_id,source,external_id' });
  if (error) throw error;
}

// ---- Subscribers ----

export async function getActiveSubscribers(): Promise<SubscriberRow[]> {
  const { data, error } = await db()
    .from('subscribers')
    .select()
    .eq('confirmed', true)
    .is('unsubscribed_at', null);
  if (error) throw error;
  return data ?? [];
}

export async function addSubscriber(
  email: string,
): Promise<{ confirmToken: string }> {
  const confirmToken = crypto.randomUUID();
  const { error } = await db()
    .from('subscribers')
    .upsert(
      { email, confirmed: false, confirm_token: confirmToken },
      { onConflict: 'email' },
    );
  if (error) throw error;
  return { confirmToken };
}

export async function confirmSubscriber(token: string): Promise<boolean> {
  const { data, error } = await db()
    .from('subscribers')
    .update({ confirmed: true, confirm_token: null })
    .eq('confirm_token', token)
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function unsubscribeByEmail(email: string): Promise<void> {
  const { error } = await db()
    .from('subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email);
  if (error) throw error;
}
