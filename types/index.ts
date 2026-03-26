// ---- Source types ----
export type Source =
  | 'reddit'
  | 'hackernews'
  | 'twitter'
  | 'exa'
  | 'rss_anthropic'
  | 'rss_openai'
  | 'rss_deepmind';

// ---- Raw item from any source ----
export interface RawItem {
  id: string;                    // deterministic: source + external_id
  source: Source;
  externalId: string;
  title: string;
  url: string;
  body?: string;
  author?: string;
  score?: number;
  commentCount?: number;
  publishedAt: string;           // ISO 8601
  subreddit?: string;
  metadata?: Record<string, unknown>;
}

// ---- Scored item after Claude Haiku ----
export interface ScoredItem extends RawItem {
  personalRelevance: number;     // 0-10
  publicInterest: number;        // 0-10
  scoringRationale: string;      // personal-perspective rationale
  publicRationale: string;       // public-perspective rationale
  commentAngle?: string;         // only when personalRelevance >= 7
}

// ---- Database row types ----
export interface DigestRow {
  id: string;
  date: string;                  // YYYY-MM-DD
  status: 'pending' | 'scoring' | 'complete' | 'failed';
  item_count: number;
  created_at: string;
}

export interface DigestItemRow {
  id: string;
  digest_id: string;
  source: Source;
  external_id: string;
  title: string;
  url: string;
  body: string | null;
  author: string | null;
  source_score: number | null;
  comment_count: number | null;
  published_at: string;
  personal_relevance: number;
  public_interest: number;
  scoring_rationale: string;
  public_rationale: string | null;
  comment_angle: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SubscriberRow {
  id: string;
  email: string;
  confirmed: boolean;
  confirm_token: string | null;
  unsubscribe_token: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

// ---- Pipeline result ----
export interface PipelineResult {
  digestId: string;
  date: string;
  totalItems: number;
  publicItems: number;
  personalItems: number;
  emailsSent: {
    personal: boolean;
    public: boolean;
    subscriberCount: number;
  };
}
