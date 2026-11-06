-- The only public marketing slot. Drafts and client data stay private.
-- No campaign is automatically published on migration.
CREATE TABLE IF NOT EXISTS yad_campaign_publication (
 slot SMALLINT PRIMARY KEY DEFAULT 1 CHECK (slot=1),
 campaign_id UUID NOT NULL REFERENCES yad_campaign_drafts(id) ON DELETE CASCADE,
 published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS yad_campaign_publication_campaign_idx
 ON yad_campaign_publication(campaign_id);
