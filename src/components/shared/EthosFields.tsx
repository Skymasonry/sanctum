"use client"

import { GUILD_ETHOS_TERMS } from "@/lib/guild-ethos-terms"

import { HelpTooltip } from "./HelpTooltip"

interface EthosFieldsProps {
  evolutionaryPurpose: string
  onEvolutionaryPurposeChange: (value: string) => void
  patternIntegrity: string
  onPatternIntegrityChange: (value: string) => void
}

/**
 * The two guild-level echoes of the Sky Masons Trust Manifesto:
 * Evolutionary Purpose and Pattern Integrity. Shared between the
 * guild seeder form (where it's skippable) and guild settings (where
 * it's always shown, for filling in later).
 */
export function EthosFields({
  evolutionaryPurpose,
  onEvolutionaryPurposeChange,
  patternIntegrity,
  onPatternIntegrityChange,
}: EthosFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <label className="block text-xs uppercase tracking-widest text-faint">
            {GUILD_ETHOS_TERMS.evolutionaryPurpose.label}
          </label>
          <HelpTooltip label={GUILD_ETHOS_TERMS.evolutionaryPurpose.label}>
            {GUILD_ETHOS_TERMS.evolutionaryPurpose.definition}
          </HelpTooltip>
        </div>
        <textarea
          value={evolutionaryPurpose}
          onChange={e => onEvolutionaryPurposeChange(e.target.value)}
          rows={3}
          placeholder="What wants to happen through this guild?"
          className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <label className="block text-xs uppercase tracking-widest text-faint">
            {GUILD_ETHOS_TERMS.patternIntegrity.label}
          </label>
          <HelpTooltip label={GUILD_ETHOS_TERMS.patternIntegrity.label}>
            {GUILD_ETHOS_TERMS.patternIntegrity.definition}
          </HelpTooltip>
        </div>
        <textarea
          value={patternIntegrity}
          onChange={e => onPatternIntegrityChange(e.target.value)}
          rows={3}
          placeholder="What holds this guild's shape when things get wobbly?"
          className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
        />
      </div>
    </div>
  )
}
