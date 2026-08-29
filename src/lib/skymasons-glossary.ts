/**
 * Sky Masons vocabulary used outside the guild-ethos context — e.g. on
 * the From Sky To Stone application, where "syntropic" and "BGF" show
 * up in the intro copy before a newcomer has any reason to know them.
 * Kept separate from guild-ethos-terms.ts since that one is guild
 * field-specific; this is the general glossary.
 */
export const SKYMASONS_TERMS = {
  syntropy: {
    label: "Syntropy",
    definition:
      "The complement of entropy — life's self-organising, generative tendency. Sky Masons describes itself as a syntropic culture: oriented toward growth, connection, and building up rather than winding down.",
  },
  boatGoesFaster: {
    label: "Boat Goes Faster (BGF)",
    definition:
      "The group's central test for any decision or invitation: does this serve the Evolutionary Purpose? If it doesn't make the boat go faster, why are we doing it?",
  },
  kairosTime: {
    label: "Kairos Time",
    definition:
      "Letting things unfold in their own right time rather than forcing a timeline onto them — without using that as an excuse to dodge present responsibilities.",
  },
} as const
