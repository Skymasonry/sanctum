-- Re-authors the From Sky To Stone scroll's intro as structured
-- heading/body blocks (see 011) instead of one flat description blob,
-- and shortens description to the one-liner shown on the Scrolls list
-- card.

BEGIN;

UPDATE scrolls
SET
  description = 'Applications for the 2026 gathering — new and returning members.',
  content_blocks = $blocks$[
    {"id": "welcome", "type": "heading", "text": "Welcome"},
    {"id": "welcome-body", "type": "body", "text": "You have been chosen to join the Sky Masons, a community of men dedicated to walking their path, living with purpose, and building a network of like-minded, heart-centred individuals. Most of us arrive by nomination — an existing brother saw something in you and vouched for you — so if you're reading this, someone already believes you belong here."},

    {"id": "story", "type": "heading", "text": "Our Story"},
    {"id": "story-body", "type": "body", "text": "We began in 2024 with monthly online check-ins. In 2025 we held our first in-person gathering in the Australian highlands on Taungurung land, where we connected deeply while supporting the land and each other. We left with a vision in mind, and through the past year we've maintained a strong core of men — each dedicated to their own unique plans, while showing up for one another."},

    {"id": "purpose", "type": "heading", "text": "From Sky To Stone"},
    {"id": "purpose-body", "type": "body", "text": "From Sky To Stone has been designed to bring together brothers who are on a path to fulfilling potential. This immersion intends to offer support in transforming the aspirations and dreams of the \"sky\" into actionable and achievable outcomes — into stone."},

    {"id": "details", "type": "heading", "text": "Event Details"},
    {"id": "details-body", "type": "body", "text": "Location: Koonyum Range, Bundjalung Country, Northern NSW\nWhen: Thursday to Sunday — dates to be confirmed\nContribution: $250–$500 (sliding scale), cash, for the in-person weekend only. The online container has no cost.\nThis is a BYO camping event."},

    {"id": "ongoing", "type": "heading", "text": "Ongoing Activities"},
    {"id": "ongoing-body", "type": "body", "text": "Monthly Mastermind — first Wednesday of the month, 6:30pm AET\nWorkshops & Group Discussions — Wednesdays, 6:30pm AET\nCircle In The Sky — open sharing space most weeks, sometimes as little as two brothers catching up"},

    {"id": "ethos", "type": "heading", "text": "The Ethos"},
    {"id": "ethos-body", "type": "body", "text": "Sky Masons operates non-hierarchically. Leadership is self-initiated — you step up when you feel the call, and step back to let others lead. Financial contribution is a sliding scale based on individual capacity, not a fixed fee. We are anti-extraction and pro-inclusion: the aim is to leave everything we touch better than we found it."},

    {"id": "agreement", "type": "heading", "text": "The Agreement"},
    {"id": "agreement-body", "type": "body", "text": "By applying, you're agreeing to:\n1. Self-Responsibility — full accountability for your own experience, wellbeing, and choices.\n2. Mutual Respect — treating other members with respect and honouring stated boundaries.\n3. Active Participation — this weekend is co-created, not a service you consume.\n4. Confidentiality — what's shared in circle stays in circle.\n5. Financial Contribution — honouring your contribution commitment, or raising the need for assistance in advance.\n6. Open-Mindedness — coming willing to learn, be challenged, and encounter people unlike yourself."},

    {"id": "start", "type": "heading", "text": "Before You Begin"},
    {"id": "start-body", "type": "body", "text": "Fill in what you can below — everything except your name and email can be updated later. Submitting joins you to the From Sky To Stone guild in the Sanctum."}
  ]$blocks$::jsonb
WHERE guild_id = 'from-sky-to-stone';

COMMIT;
