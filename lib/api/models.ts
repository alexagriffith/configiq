const DEFAULT_TIMEOUT_SECONDS = 30

export async function fetchSupportedModels(): Promise<string[]> {
  const baseUrl = process.env.AICONFIGURATOR_API_URL || ''
  const username = process.env.AICONFIGURATOR_USERNAME || ''
  const password = process.env.AICONFIGURATOR_PASSWORD || ''
  const timeoutSeconds = parseInt(process.env.AICONFIGURATOR_TIMEOUT_SECONDS || '', 10) || DEFAULT_TIMEOUT_SECONDS

  if (!baseUrl) {
    throw new Error('AICONFIGURATOR_API_URL is not configured')
  }

  const response = await fetch(`${baseUrl}/get_supported_models`, {
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

  throw new Error('Unexpected response format from /get_supported_models')
}
