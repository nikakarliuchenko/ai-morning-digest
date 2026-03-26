-- Add public-facing rationale column for split scoring prompts.
-- Nullable so existing rows are unaffected.
ALTER TABLE digest_items ADD COLUMN public_rationale text;
