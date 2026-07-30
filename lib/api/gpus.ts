const DEFAULT_TIMEOUT_SECONDS = 30

export interface AicHardwareSpec {
  system: string
  mem_bw: number
  mem_bw_empirical_scaling_factor: number
  mem_empirical_constant_latency: number
  mem_capacity: number
  bfloat16_tc_flops: number
  int8_tc_flops: number
  fp8_tc_flops: number
  power: number
  sm_version: number
}

function getAicConfig() {
  const baseUrl = process.env.AICONFIGURATOR_API_URL || ''
  const username = process.env.AICONFIGURATOR_USERNAME || ''
  const password = process.env.AICONFIGURATOR_PASSWORD || ''
  const timeoutSeconds = parseInt(process.env.AICONFIGURATOR_TIMEOUT_SECONDS || '', 10) || DEFAULT_TIMEOUT_SECONDS

  if (!baseUrl) {
    throw new Error('AICONFIGURATOR_API_URL is not configured')
  }

  return { baseUrl, username, password, timeoutSeconds }
}

export async function fetchHardwareList(): Promise<string[]> {
  const { baseUrl, username, password, timeoutSeconds } = getAicConfig()

  const response = await fetch(`${baseUrl}/get_hardware_list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  })

  if (!response.ok) {
    throw new Error(`AIConfigurator returned HTTP ${response.status}`)
  }

  const data = await response.json()

  if (Array.isArray(data)) {
    return data as string[]
  }

  throw new Error('Unexpected response format from /get_hardware_list')
}

export async function fetchHardwareSpec(system: string): Promise<AicHardwareSpec> {
  const { baseUrl, username, password, timeoutSeconds } = getAicConfig()

  const response = await fetch(`${baseUrl}/get_hardware`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ system, username, password }),
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  })

  if (!response.ok) {
    throw new Error(`AIConfigurator returned HTTP ${response.status}`)
  }

  const data = await response.json()
  return { system, ...data } as AicHardwareSpec
}
