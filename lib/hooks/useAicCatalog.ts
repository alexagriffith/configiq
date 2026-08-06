'use client'

import { useState, useEffect } from 'react'

export interface GpuOption {
  systemId: string
  label: string
  vendor: string
  vramGb: number | null
  bandwidthTbps: number | null
  tflopsBf16: number | null
  tdpWatts: number | null
  gpusPerNode: number | null
}

export interface AicCatalog {
  gpuOptions: GpuOption[]
  modelOptions: string[]
  isLoading: boolean
  error: string | null
}

const GB = 1_073_741_824

function mapSystem(s: Record<string, unknown>): GpuOption {
  const memBytes = typeof s.memory_bytes === 'number' ? s.memory_bytes : 0
  return {
    systemId: typeof s.id === 'string' ? s.id : '',
    label: typeof s.name === 'string' ? s.name : (typeof s.id === 'string' ? s.id : ''),
    vendor: typeof s.vendor === 'string' ? s.vendor : '',
    vramGb: memBytes > 0 ? Math.round(memBytes / GB) : null,
    bandwidthTbps: null,
    tflopsBf16: null,
    tdpWatts: typeof s.tdp_watts === 'number' ? s.tdp_watts : null,
    gpusPerNode: typeof s.gpus_per_node === 'number' ? s.gpus_per_node : null,
  }
}

// Module-level cache — shared across all components, survives re-renders
let cachedGpus: GpuOption[] | null = null
let cachedModels: string[] | null = null
let fetchPromise: Promise<void> | null = null

export function useAicCatalog(): AicCatalog {
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>(cachedGpus ?? [])
  const [modelOptions, setModelOptions] = useState<string[]>(cachedModels ?? [])
  const [isLoading, setIsLoading] = useState(cachedGpus === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedGpus !== null && cachedModels !== null) {
      setGpuOptions(cachedGpus)
      setModelOptions(cachedModels)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const aicUrl = process.env.NEXT_PUBLIC_AICONFIGURATOR_API_URL || 'https://www.aiconfigurator.dev'

    async function fetchCatalog() {
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const [systemsRes, modelsRes] = await Promise.all([
            fetch(`${aicUrl}/systems?include=specs`),
            fetch(`${aicUrl}/models`),
          ])

          if (!systemsRes.ok) throw new Error(`Systems fetch failed (${systemsRes.status})`)
          if (!modelsRes.ok) throw new Error(`Models fetch failed (${modelsRes.status})`)

          const systemsData = await systemsRes.json()
          const modelsData = await modelsRes.json()

          const systems = (systemsData.systems ?? []) as Record<string, unknown>[]
          const gpus = systems.map(mapSystem)

          const models = (modelsData.models ?? []) as unknown[]
          const modelList = models.filter((m): m is string => typeof m === 'string')

          if (gpus.length === 0 || modelList.length === 0) {
            throw new Error('AIC returned empty catalog')
          }

          cachedGpus = gpus
          cachedModels = modelList
        })()
      }

      try {
        await fetchPromise
        if (!cancelled) {
          setGpuOptions(cachedGpus!)
          setModelOptions(cachedModels!)
        }
      } catch (err) {
        fetchPromise = null
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch catalog')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCatalog()
    return () => { cancelled = true }
  }, [])

  return { gpuOptions, modelOptions, isLoading, error }
}
