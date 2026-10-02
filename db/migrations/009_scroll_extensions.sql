-- Extends Scrolls to cover guild-application forms: a header image, an
-- auto-join-guild-on-submit flag, and a public (no-auth) access flag —
-- so an application like From Sky To Stone can live as a native Scroll
-- instead of a bespoke one-off feature.
--
-- Also drops event_applications: the bespoke table from the previous
-- migration, superseded by this generalization before anything used it.

BEGIN;

ALTER TABLE scrolls
  ADD COLUMN header_image_url TEXT,
  ADD COLUMN auto_join_guild BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN public_access BOOLEAN NOT NULL DEFAULT false;

-- Anonymous (public_access) submissions have no Authentik username —
-- they're identified by the email they enter in the form instead.
ALTER TABLE scroll_submissions
  ALTER COLUMN submitted_by DROP NOT NULL,
  ADD COLUMN submitted_email TEXT;

DROP TABLE IF EXISTS event_applications;

COMMIT;
