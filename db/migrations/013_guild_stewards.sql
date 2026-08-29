-- Stewards: the ongoing pattern-integrity role, distinct from the
-- founding seeder. Zero or more per guild, editable by the seeder or
-- any current steward. seeder_uid on guilds stays a single column —
-- the founding act is one person's; stewardship is the role designed
-- to be shared and to change hands over time.

BEGIN;

CREATE TABLE IF NOT EXISTS guild_stewards (
    guild_id  TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

COMMIT;
