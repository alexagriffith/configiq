'use client'

import { useState, useEffect } from 'react'

export interface GpuOption {
  systemId: string
  label: string
  vramGb: number | null
  bandwidthTbps: number | null
  tflopsBf16: number | null
}

export interface AicCatalog {
  gpuOptions: GpuOption[]
  modelOptions: string[]
  isLoading: boolean
  error: string | null
}

function mapGpu(g: Record<string, unknown>): GpuOption {
  return {
    systemId: (g.system ?? '') as string,
    label: (g.name ?? g.system ?? '') as string,
    vramGb: typeof g.mem_capacity === 'number' ? g.mem_capacity : null,
    bandwidthTbps: typeof g.mem_bw === 'number' ? g.mem_bw : null,
    tflopsBf16: typeof g.bfloat16_tc_flops === 'number' ? g.bfloat16_tc_flops : null,
  }
}

export function useAicCatalog(): AicCatalog {
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>([])
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCatalog() {
      try {
        const [gpuRes, modelRes] = await Promise.all([
          fetch('/api/v1/gpus'),
          fetch('/api/v1/models'),
        ])

        if (!gpuRes.ok) throw new Error(`GPU catalog fetch failed (${gpuRes.status})`)
        if (!modelRes.ok) throw new Error(`Model catalog fetch failed (${modelRes.status})`)

        const gpuData = await gpuRes.json()
        const modelData = await modelRes.json()

        if (cancelled) return

        const gpus = ((gpuData.data?.gpus ?? []) as Record<string, unknown>[]).map(mapGpu)
        setGpuOptions(gpus)

        const models = ((modelData.data?.models ?? []) as unknown[]).map(m =>
          typeof m === 'string' ? m : ''
        ).filter(Boolean)
        setModelOptions(models)
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
