const DEFAULT_TIMEOUT_SECONDS = 30

export interface AicSystemDetail {
  id: string
  name: string
  vendor: string
  architecture: string
  memory_bytes: number
  tdp_watts: number
  gpus_per_node: number
}

function getAicConfig() {
  const baseUrl = process.env.AICONFIGURATOR_API_URL || ''
  const timeoutSeconds = parseInt(process.env.AICONFIGURATOR_TIMEOUT_SECONDS || '', 10) || DEFAULT_TIMEOUT_SECONDS

  if (!baseUrl) {
    throw new Error('AICONFIGURATOR_API_URL is not configured')
  }

  return { baseUrl, timeoutSeconds }
}

export async function fetchSystems(includeSpecs = false): Promise<AicSystemDetail[]> {
  const { baseUrl, timeoutSeconds } = getAicConfig()

  const url = includeSpecs
    ? `${baseUrl}/systems?include=specs`
    : `${baseUrl}/systems`

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  })

  if (!response.ok) {
    throw new Error(`AIConfigurator returned HTTP ${response.status}`)
  }

  const data = await response.json()
  const systems = data?.systems

  if (!Array.isArray(systems)) {
    throw new Error('Unexpected response format from /systems')
  }

  return systems.map((s: Record<string, unknown>): AicSystemDetail => ({
    id: typeof s.id === 'string' ? s.id : '',
    name: typeof s.name === 'string' ? s.name : '',
    vendor: typeof s.vendor === 'string' ? s.vendor : '',
    architecture: typeof s.architecture === 'string' ? s.architecture : '',
    memory_bytes: typeof s.memory_bytes === 'number' ? s.memory_bytes : 0,
    tdp_watts: typeof s.tdp_watts === 'number' ? s.tdp_watts : 0,
    gpus_per_node: typeof s.gpus_per_node === 'number' ? s.gpus_per_node : 0,
  }))
}

export async function fetchSystemIds(): Promise<string[]> {
  const systems = await fetchSystems(false)
  return systems.map(s => s.id)
}
