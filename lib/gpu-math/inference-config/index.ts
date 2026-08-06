// Stub — implement when inference config engine is built

export type { InferenceConfigResult, InferenceRequest } from './types'

export function computeInferenceConfig(_request: import('./types').InferenceRequest): import('./types').InferenceConfigResult {
  throw new Error('computeInferenceConfig is not yet implemented — use the AIC /recommend API via recommend-adapter instead.')
}
