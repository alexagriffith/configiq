const DEFAULT_TIMEOUT_SECONDS = 30

export interface AicModelDetail {
  name: string
  architecture: string
  layers: number
  numAttentionHeads: number
  numKvHeads: number
  headDim: number
  hiddenSize: number
  interSize: number
  vocabSize: number
  contextLength: number
  numExperts: number | null
  topK: number | null
  moeInterSize: number | null
}

function getAicConfig() {
  const baseUrl = process.env.AICONFIGURATOR_API_URL || ''
  const timeoutSeconds = parseInt(process.env.AICONFIGURATOR_TIMEOUT_SECONDS || '', 10) || DEFAULT_TIMEOUT_SECONDS

  if (!baseUrl) {
    throw new Error('AICONFIGURATOR_API_URL is not configured')
  }

  return { baseUrl, timeoutSeconds }
}

export async function fetchSupportedModels(): Promise<string[]> {
  const { baseUrl, timeoutSeconds } = getAicConfig()

  const response = await fetch(`${baseUrl}/models`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  })

  if (!response.ok) {
    throw new Error(`AIConfigurator returned HTTP ${response.status}`)
  }

  const data = await response.json()
  const models = data?.models

  if (!Array.isArray(models)) {
    throw new Error('Unexpected response format from /models')
  }

  return models.filter((m: unknown): m is string => typeof m === 'string')
}

export async function fetchDetailedModels(): Promise<AicModelDetail[]> {
  const { baseUrl, timeoutSeconds } = getAicConfig()

  const [namesRes, detailedRes] = await Promise.all([
    fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    }),
    fetch(`${baseUrl}/models?detailed=true`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    }),
  ])

  if (!namesRes.ok) throw new Error(`AIConfigurator /models returned HTTP ${namesRes.status}`)
  if (!detailedRes.ok) throw new Error(`AIConfigurator /models?detailed returned HTTP ${detailedRes.status}`)

  const namesData = await namesRes.json()
  const detailedData = await detailedRes.json()

  const names = (namesData?.models ?? []).filter((m: unknown): m is string => typeof m === 'string')
  const configs = (detailedData?.models ?? []) as Record<string, unknown>[]

  return names.map((name: string, i: number): AicModelDetail => {
    const c = configs[i] ?? {}
    return {
      name,
      architecture: typeof c.architecture === 'string' ? c.architecture : '',
      layers: typeof c.layers === 'number' ? c.layers : 0,
      numAttentionHeads: typeof c.n === 'number' ? c.n : 0,
      numKvHeads: typeof c.n_kv === 'number' ? c.n_kv : 0,
      headDim: typeof c.d === 'number' ? c.d : 0,
      hiddenSize: typeof c.hidden_size === 'number' ? c.hidden_size : 0,
      interSize: typeof c.inter_size === 'number' ? c.inter_size : 0,
      vocabSize: typeof c.vocab === 'number' ? c.vocab : 0,
      contextLength: typeof c.context === 'number' ? c.context : 0,
      numExperts: typeof c.num_experts === 'number' ? c.num_experts : null,
      topK: typeof c.topk === 'number' ? c.topk : null,
      moeInterSize: typeof c.moe_inter_size === 'number' ? c.moe_inter_size : null,
    }
  })
}
