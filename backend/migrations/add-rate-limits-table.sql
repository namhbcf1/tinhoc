-- Migration: add rate_limits table for D1-based rate limiting
-- Replaces in-memory Map (useless on Workers due to stateless cold starts)
-- Used by: backend/src/utils/rate-limiter.js

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL,
  PRIMARY KEY (key)
);

-- Index for cleanup queries (optional, key is already PK)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);
