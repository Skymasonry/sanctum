-- When a new member submits the FSTS public form they don't have a
-- Sanctum account yet, so we can't add them to guilds immediately.
-- This table stores the pending joins keyed by email; they're applied
-- automatically the first time they log in (root layout checks on every
-- authenticated request — cheap because applied_at is indexed).

BEGIN;

CREATE TABLE pending_auto_joins (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    UNIQUE (email, guild_id)
);

CREATE INDEX pending_auto_joins_unapplied
    ON pending_auto_joins (lower(email))
    WHERE applied_at IS NULL;

COMMIT;
