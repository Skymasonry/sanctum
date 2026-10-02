-- Event applications: From Sky To Stone registration + the general
-- "become a Skymason" application. One row per member per event —
-- both brand-new applicants and existing members filling it in for
-- this year's event land in the same table, keyed by (event_slug,
-- user_id) so resubmitting updates rather than duplicates.

BEGIN;

CREATE TABLE IF NOT EXISTS event_applications (
    id            SERIAL PRIMARY KEY,
    event_slug    TEXT NOT NULL,
    user_id       TEXT NOT NULL,             -- Authentik username
    -- Free-form Q&A payload — see FromSkyToStoneAnswers in
    -- src/lib/event-applications.ts for the shape currently written.
    answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
    agreed        BOOLEAN NOT NULL DEFAULT false,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_slug, user_id)
);

COMMIT;
