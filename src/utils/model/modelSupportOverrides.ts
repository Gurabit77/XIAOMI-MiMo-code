import memoize from 'lodash-es/memoize.js'
import { getAPIProvider } from './providers.js'

export type ModelCapabilityOverride =
  | 'effort'
  | 'max_effort'
  | 'xhigh_effort'
  | 'thinking'
  | 'adaptive_thinking'
  | 'interleaved_thinking'

const ANTHROPIC_TIERS = [
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  },
] as const

const OPENAI_TIERS = [
  {
    modelEnvVar: 'OPENAI_DEFAULT_OPUS_MODEL',
    capabilitiesEnvVar: 'OPENAI_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'OPENAI_DEFAULT_SONNET_MODEL',
    capabilitiesEnvVar: 'OPENAI_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'OPENAI_DEFAULT_HAIKU_MODEL',
    capabilitiesEnvVar: 'OPENAI_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  },
] as const

/**
 * Check whether a 3p model capability override is set for a model that matches one of
 * the pinned ANTHROPIC_DEFAULT_*_MODEL or OPENAI_DEFAULT_*_MODEL env vars.
 */
export const get3PModelCapabilityOverride = memoize(
  (model: string, capability: ModelCapabilityOverride): boolean | undefined => {
    const provider = getAPIProvider()
    if (provider === 'firstParty') {
      return undefined
    }
    if (provider === 'mimo') {
      return false
    }
    const m = model.toLowerCase()
    // Choose the appropriate tier list based on provider
    const tiers = provider === 'openai' ? OPENAI_TIERS : ANTHROPIC_TIERS
    for (const tier of tiers) {
      const pinned = process.env[tier.modelEnvVar]
      const capabilities = process.env[tier.capabilitiesEnvVar]
      if (!pinned || capabilities === undefined) continue
      if (m !== pinned.toLowerCase()) continue
      return capabilities
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .includes(capability)
    }
    return undefined
  },
  (model, capability) => {
    const provider = getAPIProvider()
    const tiers = provider === 'openai' ? OPENAI_TIERS : ANTHROPIC_TIERS
    return [
      provider,
      model.toLowerCase(),
      capability,
      ...tiers.flatMap(tier => [
        process.env[tier.modelEnvVar] ?? '',
        process.env[tier.capabilitiesEnvVar] ?? '',
      ]),
    ].join(':')
  },
)
