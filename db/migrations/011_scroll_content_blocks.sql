-- Structured page content for a scroll: an ordered list of
-- {id, type: 'heading'|'body', text} blocks, editable from the site
-- (ScrollDetail) instead of one flat description blob. `description`
-- stays as the short one-line blurb shown on the Scrolls list card.

BEGIN;

ALTER TABLE scrolls
  ADD COLUMN content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
