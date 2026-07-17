-- Slice 4: native member profiles — replaces the Nextcloud Contacts
-- app for the profile surface. Identity itself still comes from
-- Authentik SSO; this table is a Sanctum-owned extension.

BEGIN;

CREATE TABLE profiles (
    user_id       TEXT PRIMARY KEY,             -- Authentik username
    display_name  TEXT NOT NULL,
    email         TEXT NOT NULL DEFAULT '',
    bio           TEXT NOT NULL DEFAULT '',
    -- Free-form contact + social payload: {phone, website, links: [...], location, etc.}
    contact       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Whether the profile is visible to other members (default yes).
    -- Grandmaster steward-mode profiles may flip this later.
    visible       BOOLEAN NOT NULL DEFAULT true,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
