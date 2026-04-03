-- Enable Row Level Security on all tables
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by the pipeline)
CREATE POLICY "Service role full access" ON digests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON digest_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Public read for dashboard (anon key)
CREATE POLICY "Public read digests" ON digests
  FOR SELECT USING (true);

CREATE POLICY "Public read digest_items" ON digest_items
  FOR SELECT USING (true);
