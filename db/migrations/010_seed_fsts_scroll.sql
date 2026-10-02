-- Seeds the From Sky To Stone application as a native Scroll on the
-- from-sky-to-stone guild, replacing the bespoke feature from
-- migration 008 (dropped in 009). Content adapted from the Trust
-- Manifesto and the previous JotForm registration flow.

BEGIN;

WITH scroll AS (
  INSERT INTO scrolls (guild_id, title, description, created_by, published, auto_join_guild, public_access)
  VALUES (
    'from-sky-to-stone',
    'From Sky To Stone — Application',
    $desc$You have been chosen to join the Sky Masons, a community of men dedicated to walking their path, living with purpose, and building a network of like-minded, heart-centred individuals. Most of us arrive by nomination — an existing brother saw something in you and vouched for you — so if you're reading this, someone already believes you belong here.

We began in 2024 with monthly online check-ins. In 2025 we held our first in-person gathering in the Australian highlands on Taungurung land, where we connected deeply while supporting the land and each other. We left with a vision in mind, and through the past year we've maintained a strong core of men — each dedicated to their own unique plans, while showing up for one another.

From Sky To Stone has been designed to bring together brothers who are on a path to fulfilling potential. This immersion intends to offer support in transforming the aspirations and dreams of the "sky" into actionable and achievable outcomes — into stone.

EVENT DETAILS
Location: Koonyum Range, Bundjalung Country, Northern NSW
When: Thursday to Sunday — dates to be confirmed
Contribution: $250–$500 (sliding scale), cash, for the in-person weekend only. The online container has no cost.
This is a BYO camping event.

ONGOING ACTIVITIES (year-round, online)
Monthly Mastermind — first Wednesday of the month, 6:30pm AET
Workshops & Group Discussions — Wednesdays, 6:30pm AET
Circle In The Sky — open sharing space most weeks, sometimes as little as two brothers catching up

THE ETHOS
Sky Masons operates non-hierarchically. Leadership is self-initiated — you step up when you feel the call, and step back to let others lead. Financial contribution is a sliding scale based on individual capacity, not a fixed fee. We are anti-extraction and pro-inclusion: the aim is to leave everything we touch better than we found it.

By applying, you're agreeing to:
1. Self-Responsibility — full accountability for your own experience, wellbeing, and choices.
2. Mutual Respect — treating other members with respect and honouring stated boundaries.
3. Active Participation — this weekend is co-created, not a service you consume.
4. Confidentiality — what's shared in circle stays in circle.
5. Financial Contribution — honouring your contribution commitment, or raising the need for assistance in advance.
6. Open-Mindedness — coming willing to learn, be challenged, and encounter people unlike yourself.

Fill in what you can below — everything except your name and email can be updated later. Submitting joins you to the From Sky To Stone guild in the Sanctum.$desc$,
    'Tomas.Busby',
    true,
    true,
    true
  )
  RETURNING id
)
INSERT INTO scroll_questions (scroll_id, text, type, required, "position", options)
SELECT scroll.id, q.text, q.type, q.required, q.position, q.options::jsonb
FROM scroll,
LATERAL (VALUES
  ('Full name',                                                                                   'short',    true,  0,  '[]'),
  ('Email',                                                                                        'short',    true,  1,  '[]'),
  ('Mobile (we use Signal)',                                                                       'short',    false, 2,  '[]'),
  ('Birth date',                                                                                    'date',     false, 3,  '[]'),
  ('Address line 1',                                                                                'short',    false, 4,  '[]'),
  ('Address line 2',                                                                                'short',    false, 5,  '[]'),
  ('City',                                                                                          'short',    false, 6,  '[]'),
  ('State / Province',                                                                              'short',    false, 7,  '[]'),
  ('Postcode',                                                                                      'short',    false, 8,  '[]'),
  ('Are you prepared to contribute $250–$500 (sliding scale) to confirm your spot upon receiving an official invitation?', 'radio', true, 9,  '["Yes","No","I will require financial assistance"]'),
  ('Dietary requirements',                                                                          'short',    false, 10, '[]'),
  ('Can you commit to arriving Thursday and staying until Sunday?',                                 'radio',    true,  11, '["Yes","No"]'),
  ('If you''re unable to attend in person, would you still like to join the online container?',     'radio',    false, 12, '["Yes","No","N/A — I''m attending in person"]'),
  ('This is a BYO camping event. Any gear you''d like us to help organise? (especially if you''re flying in)', 'long', false, 13, '[]'),
  ('Are you a returning member?',                                                                   'radio',    false, 14, '["Yes","No, first From Sky To Stone"]'),
  ('If returning, can you arrive Wednesday instead?',                                                'radio',    false, 15, '["Yes","No","N/A"]'),
  ('Anything physical or mental we should be aware of? (kept confidential, seen only by the organising circle)', 'long', false, 16, '[]'),
  ('Your Focus — everybody has an innate drive towards actualisation. What are you working on and moving towards? e.g. launching or growing a business, a community project, a creative work, starting/raising a family, self-development. This can evolve over time.', 'long', true, 17, '[]'),
  ('Roles & Contributions — anything you''d like to offer the weekend? Movement practices, music, games, workshops — whatever you bring.', 'long', false, 18, '[]'),
  ('Do you agree to the terms above?',                                                              'radio',    true,  19, '["Yes","No"]')
) AS q(text, type, required, position, options);

COMMIT;
