import type { PipelineResult } from '@/types';
import { fetchAllSources } from '@/lib/fetchers';
import { scoreItems } from '@/lib/scorer';
import {
  createDigest,
  updateDigestStatus,
  insertDigestItems,
  getDigestByDate,
} from '@/lib/supabase/queries';
import { sendDigestEmails } from '@/lib/email';
import { deduplicateByTopic } from '@/lib/dedup';

export async function runPipeline(date: string): Promise<PipelineResult> {
  console.log(`\n=== AI Morning Digest Pipeline: ${date} ===\n`);

  // 1. Create digest record
  const digest = await createDigest(date);
  console.log(`[pipeline] digest ${digest.id} created (status: ${digest.status})`);

  try {
    // 2. Fetch from all sources
    console.log('\n[pipeline] fetching...');
    const raw = await fetchAllSources();

    if (raw.length === 0) {
      await updateDigestStatus(digest.id, 'failed');
      throw new Error('No items fetched from any source');
    }

    // 3. Score with Claude Haiku
    console.log('\n[pipeline] scoring...');
    await updateDigestStatus(digest.id, 'scoring');
    const scored = await scoreItems(raw);

    if (scored.length === 0) {
      await updateDigestStatus(digest.id, 'failed');
      throw new Error('Scoring returned zero items');
    }

    // 3b. Deduplicate by topic
    console.log('\n[pipeline] deduplicating by topic...');
    const deduplicated = deduplicateByTopic(scored);
    console.log(`[pipeline] ${scored.length} → ${deduplicated.length} after topic dedup`);

    // 4. Persist to Supabase
    console.log('\n[pipeline] saving to database...');
    await insertDigestItems(digest.id, deduplicated);
    await updateDigestStatus(digest.id, 'complete', deduplicated.length);

    // 5. Fetch back from DB (gets DigestItemRow[] for email templates)
    const result = await getDigestByDate(date);
    if (!result) throw new Error('Failed to read back digest after insert');

    // 6. Send emails
    console.log('\n[pipeline] sending emails...');
    const emails = await sendDigestEmails(date, result.items);

    const personalCount = result.items.filter((i) => i.personal_relevance >= 7).length;
    const publicCount = result.items.filter((i) => i.public_interest >= 6).length;

    console.log(`\n=== Pipeline complete ===`);
    console.log(`  Items: ${scored.length} scored, ${deduplicated.length} after dedup`);
    console.log(`  Personal (>=7): ${personalCount}`);
    console.log(`  Public (>=6): ${publicCount}`);
    console.log(`  Emails: personal=${emails.personal}, public=${emails.public}, subscribers=${emails.subscriberCount}`);

    return {
      digestId: digest.id,
      date,
      totalItems: deduplicated.length,
      personalItems: personalCount,
      publicItems: publicCount,
      emailsSent: emails,
    };
  } catch (err) {
    // Mark as failed if not already
    await updateDigestStatus(digest.id, 'failed').catch(() => {});
    throw err;
  }
}
