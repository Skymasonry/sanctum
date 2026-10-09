/**
 * Sky Masons vocabulary for a guild's ethos fields, drawn from the
 * Skymasons Trust Manifesto (July 2026 draft). Kept separate from the
 * form components so the definitions can be reused anywhere else a
 * "what does that mean?" prompt is useful.
 */
export const GUILD_ETHOS_TERMS = {
  evolutionaryPurpose: {
    label: "Evolutionary Purpose",
    definition:
      "The deep creative potential of this guild — the reason it came into being. Not a mission statement, not a five-year plan. The thing it's actually here to do. Ask: what wants to happen through this guild?",
  },
  patternIntegrity: {
    label: "Pattern Integrity",
    definition:
      "The values and practices that hold this guild's shape when it gets wobbly. What it stands for, and how it behaves — even under pressure.",
  },
} as const
