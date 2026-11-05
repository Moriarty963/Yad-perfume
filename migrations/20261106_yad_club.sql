-- Deploy to a PostgreSQL database located in Russia when collecting Russian customers' data.
-- Do NOT run against the existing international YAD order database.
CREATE TABLE IF NOT EXISTS yad_club_members (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email TEXT NOT NULL UNIQUE CHECK(length(email)<=254),
 display_name VARCHAR(80) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 promotions_opt_in BOOLEAN NOT NULL DEFAULT false,
 promotions_consented_at TIMESTAMPTZ,
 promotions_revoked_at TIMESTAMPTZ,
 consent_version VARCHAR(40),
 privacy_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 privacy_version VARCHAR(40) NOT NULL DEFAULT '2026-11-v1'
);
CREATE TABLE IF NOT EXISTS yad_club_challenges (
 email TEXT PRIMARY KEY,
 display_name VARCHAR(80) NOT NULL,
 code_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 attempts SMALLINT NOT NULL DEFAULT 0,
 promotions_requested BOOLEAN NOT NULL DEFAULT false,
 request_ip_hash CHAR(64) NOT NULL
);
CREATE TABLE IF NOT EXISTS yad_club_sessions (
 token_hash CHAR(64) PRIMARY KEY,
 member_id UUID NOT NULL REFERENCES yad_club_members(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS yad_club_sessions_expiry ON yad_club_sessions(expires_at);
CREATE TABLE IF NOT EXISTS yad_club_consent_log (
 id BIGSERIAL PRIMARY KEY,
 member_id UUID NOT NULL REFERENCES yad_club_members(id) ON DELETE CASCADE,
 consent_version VARCHAR(40) NOT NULL,
 action VARCHAR(16) NOT NULL CHECK (action IN ('opt_in','opt_out')),
 source VARCHAR(40) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS yad_club_request_log (
 id BIGSERIAL PRIMARY KEY,
 ip_hash CHAR(64) NOT NULL,
 requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yad_club_request_log_idx ON yad_club_request_log(ip_hash,requested_at);
