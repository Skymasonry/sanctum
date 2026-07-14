-- Slice 5: native Archive — replaces Nextcloud Files as the backing
-- store for guild archives. Folder tree lives in Postgres; blobs live
-- in the shared skymasons S3 bucket under a sanctum/ key prefix.

BEGIN;

CREATE TABLE file_nodes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id     TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    -- null parent = root of the guild's archive
    parent_id    UUID REFERENCES file_nodes(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    is_folder    BOOLEAN NOT NULL,
    size_bytes   BIGINT,      -- null for folders
    mime         TEXT,        -- null for folders
    -- S3 object key. Null for folders. Native uploads use
    -- sanctum/archive/{guild_id}/{id}. Migrated Nextcloud files still
    -- point at their original urn:oid:{fileid} until a background job
    -- rewrites them.
    storage_key  TEXT,
    created_by   TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Two children of the same parent can't share a name
    UNIQUE (parent_id, name),
    -- Also enforce uniqueness at guild root (where parent_id is NULL)
    -- via a partial index because NULLs don't collide in a normal UNIQUE.
    CHECK (is_folder OR storage_key IS NOT NULL),
    CHECK (NOT is_folder OR (storage_key IS NULL AND size_bytes IS NULL AND mime IS NULL))
);
CREATE UNIQUE INDEX file_nodes_root_unique
    ON file_nodes (guild_id, name)
    WHERE parent_id IS NULL;
CREATE INDEX file_nodes_parent_idx ON file_nodes(parent_id);
CREATE INDEX file_nodes_guild_idx ON file_nodes(guild_id);

COMMIT;
