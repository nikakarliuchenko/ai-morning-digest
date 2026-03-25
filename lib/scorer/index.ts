import Anthropic from '@anthropic-ai/sdk';
import type { RawItem, ScoredItem } from '@/types';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_BATCH_WAIT_MS = 5 * 60 * 1000; // 5 min
const POLL_INTERVAL_MS = 10_000;

const SYSTEM_PROMPT = `You are an AI content scorer for a daily developer digest. Score for a developer who:
- Builds production apps with Next.js and TypeScript
- Uses Contentful as a headless CMS
- Works with AI tools (Claude, GPT, Cursor, v0) daily
- Builds AI-powered features and integrations
- Is active on Reddit/X, building in public

Provide TWO scores:

PERSONAL_RELEVANCE (0-10): How useful for this specific developer?
  9-10: Directly impacts their stack (Next.js updates, Claude API changes, Contentful)
  7-8: Highly relevant to their tools or building-in-public strategy
  4-6: Generally interesting to AI-aware developers
  1-3: Tangentially related
  0: Irrelevant

PUBLIC_INTEREST (0-10): How interesting to any AI-curious developer?
  9-10: Major announcement, breakthrough, viral discussion
  7-8: Noteworthy development, insightful thread, practical tutorial
  4-6: Moderate industry news
  1-3: Niche or low-signal
  0: Spam

Score higher for: actionable today, practitioner-specific, early signal on emerging tools, honest trade-off discussions.
Score lower for: funding news, generic opinion pieces, hype without substance.

If PERSONAL_RELEVANCE >= 7, provide COMMENT_ANGLE: a specific suggestion for how the developer could engage publicly, referencing their Next.js/AI/Contentful expertise.

Respond in JSON only:
{"personal_relevance": <int>, "public_interest": <int>, "rationale": "<one sentence>", "comment_angle": "<suggestion or null>"}`;

function buildUserMessage(item: RawItem): string {
  const parts = [
    `Source: ${item.source} | Title: ${item.title}`,
    `URL: ${item.url} | Author: ${item.author ?? 'unknown'}`,
  ];
  if (item.score !== undefined) parts.push(`Upvotes: ${item.score}`);
  if (item.commentCount !== undefined) parts.push(`Comments: ${item.commentCount}`);
  parts.push(`Published: ${item.publishedAt}`);
  if (item.body) parts.push(`Body: ${item.body.slice(0, 500)}`);
  return parts.join('\n');
}

export async function scoreItems(items: RawItem[]): Promise<ScoredItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  if (items.length === 0) return [];

  const client = new Anthropic({ apiKey });

  console.log(`[scorer] scoring ${items.length} items via Batch API...`);

  try {
    return await scoreBatch(client, items);
  } catch (err) {
    console.warn(`[scorer] batch failed, falling back to sequential:`, err);
    return scoreSequential(client, items);
  }
}

async function scoreBatch(
  client: Anthropic,
  items: RawItem[],
): Promise<ScoredItem[]> {
  const requests = items.map((item) => ({
    custom_id: sanitizeCustomId(item.id),
    params: {
      model: MODEL,
      max_tokens: 256,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user' as const, content: buildUserMessage(item) }],
    },
  }));

  const batch = await client.messages.batches.create({ requests });
  console.log(`[scorer] batch created: ${batch.id}`);

  const scored = await pollBatch(client, batch.id, items);
  return scored;
}

async function pollBatch(
  client: Anthropic,
  batchId: string,
  items: RawItem[],
): Promise<ScoredItem[]> {
  const start = Date.now();
  const itemMap = new Map(items.map((i) => [sanitizeCustomId(i.id), i]));

  while (Date.now() - start < MAX_BATCH_WAIT_MS) {
    const status = await client.messages.batches.retrieve(batchId);
    console.log(`[scorer] batch ${batchId}: ${status.processing_status}`);

    if (status.processing_status === 'ended') {
      return await collectBatchResults(client, batchId, itemMap);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Batch ${batchId} timed out after ${MAX_BATCH_WAIT_MS}ms`);
}

async function collectBatchResults(
  client: Anthropic,
  batchId: string,
  itemMap: Map<string, RawItem>,
): Promise<ScoredItem[]> {
  const results: ScoredItem[] = [];
  const decoder = await client.messages.batches.results(batchId);

  for await (const result of decoder) {
    const item = itemMap.get(result.custom_id);
    if (!item) continue;

    if (result.result.type === 'succeeded') {
      const text = result.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const scored = parseScoreResponse(text, item);
      if (scored) results.push(scored);
    } else {
      console.warn(`[scorer] item ${result.custom_id} failed:`, result.result.type);
    }
  }

  console.log(`[scorer] batch complete: ${results.length}/${itemMap.size} scored`);
  return results;
}

async function scoreSequential(
  client: Anthropic,
  items: RawItem[],
): Promise<ScoredItem[]> {
  console.log(`[scorer] sequential fallback for ${items.length} items`);
  const results: ScoredItem[] = [];

  for (const item of items) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(item) }],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const scored = parseScoreResponse(text, item);
      if (scored) results.push(scored);
    } catch (err) {
      console.warn(`[scorer] failed to score ${item.id}:`, err);
    }
  }

  console.log(`[scorer] sequential complete: ${results.length}/${items.length} scored`);
  return results;
}

function parseScoreResponse(text: string, item: RawItem): ScoredItem | null {
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const personalRelevance = clamp(Number(parsed.personal_relevance), 0, 10);
    const publicInterest = clamp(Number(parsed.public_interest), 0, 10);

    if (isNaN(personalRelevance) || isNaN(publicInterest)) return null;

    return {
      ...item,
      personalRelevance,
      publicInterest,
      scoringRationale: String(parsed.rationale ?? ''),
      commentAngle: parsed.comment_angle ?? undefined,
    };
  } catch {
    console.warn(`[scorer] failed to parse response for ${item.id}:`, text.slice(0, 200));
    return null;
  }
}

function sanitizeCustomId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  import('../fetchers/index.js').then(async ({ fetchAllSources }) => {
    const all = await fetchAllSources();
    const sample = all.slice(0, 5);
    console.log(`\n[test] scoring ${sample.length} items...`);
    const scored = await scoreItems(sample);
    for (const s of scored) {
      console.log(`\n--- ${s.source}: ${s.title.slice(0, 80)}`);
      console.log(`    personal=${s.personalRelevance} public=${s.publicInterest}`);
      console.log(`    rationale: ${s.scoringRationale}`);
      if (s.commentAngle) console.log(`    comment angle: ${s.commentAngle}`);
    }
  }).catch(console.error);
}
