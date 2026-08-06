'use client'

import { useState, useEffect } from 'react'

export interface GpuOption {
  systemId: string
  label: string
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
    vramGb: memBytes > 0 ? Math.round(memBytes / GB) : null,
    bandwidthTbps: null,
    tflopsBf16: null,
    tdpWatts: typeof s.tdp_watts === 'number' ? s.tdp_watts : null,
    gpusPerNode: typeof s.gpus_per_node === 'number' ? s.gpus_per_node : null,
  }
}

export function useAicCatalog(): AicCatalog {
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>([])
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const aicUrl = process.env.NEXT_PUBLIC_AICONFIGURATOR_API_URL || 'https://aiconfigurator.dev'

    async function fetchCatalog() {
      try {
        const [systemsRes, modelsRes] = await Promise.all([
          fetch(`${aicUrl}/systems?include=specs`),
          fetch(`${aicUrl}/models`),
        ])

        if (!systemsRes.ok) throw new Error(`Systems fetch failed (${systemsRes.status})`)
        if (!modelsRes.ok) throw new Error(`Models fetch failed (${modelsRes.status})`)

        const systemsData = await systemsRes.json()
        const modelsData = await modelsRes.json()

        if (cancelled) return

        const systems = (systemsData.systems ?? []) as Record<string, unknown>[]
        setGpuOptions(systems.map(mapSystem))

        const models = (modelsData.models ?? []) as unknown[]
        setModelOptions(models.filter((m): m is string => typeof m === 'string'))
      } catch (err) {
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
