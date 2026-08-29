-- Leadership Circle: an optional, per-guild list of named members —
-- distinct from stewards (ongoing pattern-integrity holders) and the
-- seeder (the founder). Per the Trust Manifesto, Leadership Circles
-- are "situational roles that emerge with each idea" — the seeder (or
-- a steward) names people into it, it starts empty by default, and
-- unlike stewards it isn't self-governing: only the guild's managers
-- add/remove membership.

BEGIN;

CREATE TABLE IF NOT EXISTS guild_leadership_circle (
    guild_id  TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

COMMIT;
