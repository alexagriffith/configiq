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

export interface ModelDetail {
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

export interface AicCatalog {
  gpuOptions: GpuOption[]
  modelOptions: string[]
  modelDetails: ModelDetail[]
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

function mapModelDetail(name: string, c: Record<string, unknown>): ModelDetail {
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
}

// Module-level cache — shared across all components, survives re-renders
let cachedGpus: GpuOption[] | null = null
let cachedModels: string[] | null = null
let cachedModelDetails: ModelDetail[] | null = null
let fetchPromise: Promise<void> | null = null

export function useAicCatalog(): AicCatalog {
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>(cachedGpus ?? [])
  const [modelOptions, setModelOptions] = useState<string[]>(cachedModels ?? [])
  const [modelDetails, setModelDetails] = useState<ModelDetail[]>(cachedModelDetails ?? [])
  const [isLoading, setIsLoading] = useState(cachedGpus === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedGpus !== null && cachedModels !== null && cachedModelDetails !== null) {
      setGpuOptions(cachedGpus)
      setModelOptions(cachedModels)
      setModelDetails(cachedModelDetails)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const aicUrl = process.env.NEXT_PUBLIC_AICONFIGURATOR_API_URL || 'https://www.aiconfigurator.dev'

    async function fetchCatalog() {
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const [systemsRes, modelsRes, detailedRes] = await Promise.all([
            fetch(`${aicUrl}/systems?include=specs`),
            fetch(`${aicUrl}/models`),
            fetch(`${aicUrl}/models?detailed=true`),
          ])

          if (!systemsRes.ok) throw new Error(`Systems fetch failed (${systemsRes.status})`)
          if (!modelsRes.ok) throw new Error(`Models fetch failed (${modelsRes.status})`)
          if (!detailedRes.ok) throw new Error(`Detailed models fetch failed (${detailedRes.status})`)

          const systemsData = await systemsRes.json()
          const modelsData = await modelsRes.json()
          const detailedData = await detailedRes.json()

          const systems = (systemsData.systems ?? []) as Record<string, unknown>[]
          const gpus = systems.map(mapSystem)

          const models = (modelsData.models ?? []) as unknown[]
          const modelList = models.filter((m): m is string => typeof m === 'string')

          const configs = (detailedData.models ?? []) as Record<string, unknown>[]
          const details = modelList.map((name, i) => mapModelDetail(name, configs[i] ?? {}))

          if (gpus.length === 0 || modelList.length === 0) {
            throw new Error('AIC returned empty catalog')
          }

          cachedGpus = gpus
          cachedModels = modelList
          cachedModelDetails = details
        })()
      }

      try {
        await fetchPromise
        if (!cancelled) {
          setGpuOptions(cachedGpus!)
          setModelOptions(cachedModels!)
          setModelDetails(cachedModelDetails!)
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

  return { gpuOptions, modelOptions, modelDetails, isLoading, error }
}
