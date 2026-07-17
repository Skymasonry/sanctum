-- Slice 2: native Quests (Kanban) — replaces Nextcloud Deck.
-- One board per guild (for now), N ordered stacks per board, N ordered
-- quests per stack, N comments per quest.

BEGIN;

CREATE TABLE quest_boards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id    TEXT NOT NULL UNIQUE REFERENCES guilds(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Quests',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quest_stacks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id    UUID NOT NULL REFERENCES quest_boards(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    "position"  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX quest_stacks_board_idx ON quest_stacks(board_id, "position");

CREATE TABLE quests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stack_id      UUID NOT NULL REFERENCES quest_stacks(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    "position"    INT NOT NULL DEFAULT 0,
    created_by    TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at        TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    labels        JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX quests_stack_idx ON quests(stack_id, "position");

CREATE TABLE quest_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    author_id   TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX quest_comments_quest_idx ON quest_comments(quest_id, created_at);

COMMIT;
