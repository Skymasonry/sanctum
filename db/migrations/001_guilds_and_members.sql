-- Sanctum native schema — Slice 1 (Membership).
-- One database, four tables. orders.json + Nextcloud groups will be
-- kept in sync during transition, then retired.

BEGIN;

CREATE TABLE guilds (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    description           TEXT NOT NULL DEFAULT '',
    icon                  TEXT NOT NULL DEFAULT '⬡',
    color                 TEXT NOT NULL DEFAULT '#c9a227',
    admission             TEXT NOT NULL DEFAULT 'open'
        CHECK (admission IN ('open', 'closed', 'mandatory')),
    category              TEXT NOT NULL DEFAULT 'social',
    pattern_integrity     TEXT NOT NULL DEFAULT '',
    evolutionary_purpose  TEXT NOT NULL DEFAULT '',
    seeder_uid            TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Nextcloud primitives (transitional — go away as chambers migrate)
    talk_room             TEXT,
    calendar_uri          TEXT,
    folder_id             BIGINT,
    folder_name           TEXT,
    deck_board_id         BIGINT,
    -- convenience mirror of what used to be resources.groupName
    group_name            TEXT
);

CREATE TABLE guild_members (
    guild_id   TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('seeder', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX guild_members_user_idx ON guild_members(user_id);

-- application form template stored per guild (agreements members must accept)
CREATE TABLE guild_application_forms (
    guild_id    TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
    agreements  JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- outstanding applications to closed guilds
CREATE TABLE guild_applications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id    TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    message     TEXT NOT NULL DEFAULT '',
    agreements  JSONB NOT NULL DEFAULT '[]'::jsonb,
    status      TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    UNIQUE (guild_id, user_id)
);
CREATE INDEX guild_applications_status_idx ON guild_applications(guild_id, status);

-- lastSeen (used by the Threshold dashboard); moves here from
-- Nextcloud IConfig user preferences.
CREATE TABLE user_last_seen (
    user_id     TEXT PRIMARY KEY,
    last_seen   TIMESTAMPTZ NOT NULL
);

COMMIT;
