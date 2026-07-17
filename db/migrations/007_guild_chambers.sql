-- Which chambers are enabled for each guild. New guilds default to
-- all seven; a seeder can toggle any of them off later.

BEGIN;

ALTER TABLE guilds
  ADD COLUMN chambers TEXT[] NOT NULL DEFAULT ARRAY[
    'pulse',
    'chamber',
    'rites',
    'quests',
    'scrolls',
    'archive',
    'brotherhood'
  ]::TEXT[];

COMMIT;
