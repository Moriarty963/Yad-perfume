-- Non-destructive schema addition for verified, moderated fragrance reviews.
CREATE TABLE IF NOT EXISTS yad_fragrance_reviews (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES yad_orders(public_id),
  fragrance_id VARCHAR(100) NOT NULL,
  author_name VARCHAR(60) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body VARCHAR(1500) NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=3),
  status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderated_at TIMESTAMPTZ,
  UNIQUE(order_id,fragrance_id)
);
CREATE INDEX IF NOT EXISTS yad_fragrance_reviews_public_idx
  ON yad_fragrance_reviews(fragrance_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS yad_fragrance_reviews_pending_idx
  ON yad_fragrance_reviews(status,created_at DESC);
