-- Slice 3: native Scrolls (forms) — replaces Nextcloud Forms.
-- A Scroll belongs to a guild and has ordered questions + submissions.

BEGIN;

CREATE TABLE scrolls (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id     TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    created_by   TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX scrolls_guild_idx ON scrolls(guild_id);

CREATE TABLE scroll_questions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scroll_id    UUID NOT NULL REFERENCES scrolls(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'short'
        CHECK (type IN ('short', 'long', 'radio', 'checkbox', 'select', 'date')),
    required     BOOLEAN NOT NULL DEFAULT false,
    "position"   INT NOT NULL DEFAULT 0,
    options      JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX scroll_questions_scroll_idx ON scroll_questions(scroll_id, "position");

CREATE TABLE scroll_submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scroll_id     UUID NOT NULL REFERENCES scrolls(id) ON DELETE CASCADE,
    submitted_by  TEXT NOT NULL,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answers       JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX scroll_submissions_scroll_idx ON scroll_submissions(scroll_id, submitted_at DESC);

COMMIT;
