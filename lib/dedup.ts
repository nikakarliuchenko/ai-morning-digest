import type { ScoredItem } from '@/types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'for', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'at', 'by', 'in', 'of', 'on', 'to', 'up',
  'with', 'from', 'into', 'about', 'as', 'it', 'its', 'this', 'that',
  'how', 'what', 'which', 'who', 'when', 'where', 'why', 'all', 'each',
  'just', 'now', 'new', 'your', 'you', 'we', 'they', 'our', 'my',
  // Domain-specific high-frequency terms that cause false clusters
  'ai', 'llm', 'model', 'models',
]);

const SIMILARITY_THRESHOLD = 0.4;
const MIN_INTERSECTION = 3;
const MIN_CLUSTER_SIZE_TO_COLLAPSE = 3;

function tokenize(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): { similarity: number; intersection: number } {
  let intersectionSize = 0;
  for (const token of a) {
    if (b.has(token)) intersectionSize++;
  }
  const unionSize = a.size + b.size - intersectionSize;
  return {
    similarity: unionSize === 0 ? 0 : intersectionSize / unionSize,
    intersection: intersectionSize,
  };
}

/**
 * Deduplicate scored items by topic similarity.
 * If 3+ items share the same core topic, keep only the highest-scored one.
 */
export function deduplicateByTopic(items: ScoredItem[]): ScoredItem[] {
  // Sort by best score descending so cluster reps are the highest-scored
  const sorted = [...items].sort(
    (a, b) =>
      Math.max(b.publicInterest, b.personalRelevance) -
      Math.max(a.publicInterest, a.personalRelevance),
  );

  const clusters: { rep: ScoredItem; tokens: Set<string>; members: ScoredItem[] }[] = [];

  for (const item of sorted) {
    const tokens = tokenize(item.title);
    let assigned = false;

    for (const cluster of clusters) {
      const { similarity, intersection } = jaccardSimilarity(tokens, cluster.tokens);
      if (similarity >= SIMILARITY_THRESHOLD && intersection >= MIN_INTERSECTION) {
        cluster.members.push(item);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({ rep: item, tokens, members: [item] });
    }
  }

  // For clusters with 3+ items, keep only the rep (highest-scored).
  // For clusters with 1-2 items, keep all members.
  const kept: ScoredItem[] = [];
  for (const cluster of clusters) {
    if (cluster.members.length >= MIN_CLUSTER_SIZE_TO_COLLAPSE) {
      kept.push(cluster.rep);
    } else {
      kept.push(...cluster.members);
    }
  }

  return kept;
}
