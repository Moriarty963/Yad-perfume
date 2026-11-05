-- YAD campaign text drafts only; no customer names, email addresses or phones.
-- Can be deployed to the existing YAD order database; independent from YAD Club profiles.
CREATE TABLE IF NOT EXISTS yad_campaign_drafts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title VARCHAR(110) NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 110),
 body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 5 AND 1500),
 target_url VARCHAR(300) NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (target_url = '' OR target_url LIKE 'https://yad-market.vercel.app/%')
);
CREATE INDEX IF NOT EXISTS yad_campaign_drafts_updated_idx
 ON yad_campaign_drafts(updated_at DESC,id DESC);
