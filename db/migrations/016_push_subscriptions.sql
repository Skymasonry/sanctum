-- Web Push subscriptions, one row per device/browser a user has
-- enabled notifications on (a person can have several — phone,
-- laptop, etc). endpoint is unique per browser push service
-- subscription, so it's the natural dedupe key.

BEGIN;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

COMMIT;
