-- Digests: one row per day
CREATE TABLE digests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'scoring', 'complete', 'failed')),
  item_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_digests_date ON digests (date DESC);

-- Digest items: scored content
CREATE TABLE digest_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id           uuid NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  source              text NOT NULL,
  external_id         text NOT NULL,
  title               text NOT NULL,
  url                 text NOT NULL,
  body                text,
  author              text,
  source_score        integer,
  comment_count       integer,
  published_at        timestamptz NOT NULL,
  personal_relevance  smallint NOT NULL CHECK (personal_relevance BETWEEN 0 AND 10),
  public_interest     smallint NOT NULL CHECK (public_interest BETWEEN 0 AND 10),
  scoring_rationale   text NOT NULL,
  comment_angle       text,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (digest_id, source, external_id)
);

CREATE INDEX idx_digest_items_digest ON digest_items (digest_id);
CREATE INDEX idx_digest_items_public ON digest_items (public_interest DESC);

-- Subscribers for public email
CREATE TABLE subscribers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE,
  confirmed       boolean NOT NULL DEFAULT false,
  confirm_token   text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);

CREATE INDEX idx_subscribers_active ON subscribers (confirmed)
  WHERE confirmed = true AND unsubscribed_at IS NULL;
