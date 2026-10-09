-- Bootstraps Tomas.Busby as steward of every existing guild, so
-- there's someone able to hand stewardship to the right people going
-- forward instead of every guild starting with zero stewards.

BEGIN;

INSERT INTO guild_stewards (guild_id, user_id)
SELECT id, 'Tomas.Busby' FROM guilds
ON CONFLICT DO NOTHING;

COMMIT;
