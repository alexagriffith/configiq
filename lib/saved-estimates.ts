// Stub — implement localStorage-backed estimate persistence

const STORAGE_KEY = 'configiq_saved_estimates'

interface SavedEstimate {
  name: string
  timestamp: number
  [key: string]: unknown
}

export function saveEstimate(estimate: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const existing = getSavedEstimates()
  existing.push({ ...estimate, timestamp: Date.now() } as SavedEstimate)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getSavedEstimates(): SavedEstimate[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getSavedEstimateCount(): number {
  return getSavedEstimates().length
}
