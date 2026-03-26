-- Add unsubscribe token for secure, tokenized unsubscribe links.
-- Nullable so existing rows are unaffected; backfill separately if needed.
ALTER TABLE subscribers ADD COLUMN unsubscribe_token uuid DEFAULT gen_random_uuid();

-- Ensure tokens are unique for lookup
CREATE UNIQUE INDEX idx_subscribers_unsubscribe_token
  ON subscribers (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
