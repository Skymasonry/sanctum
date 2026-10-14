-- Guest submissions for the FSTS application flow: someone attending
-- From Sky To Stone as a guest fills out the same form as an applicant,
-- but gets no account and no guild memberships. The flag lets stewards
-- tell guest submissions apart in the submissions viewer.
--
-- Safe to run before the code that writes it is deployed (defaults false).

BEGIN;

ALTER TABLE scroll_submissions
    ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

COMMIT;
