'use client'

import { useState, useEffect } from 'react'

export interface GpuOption {
  systemId: string
  label: string
  vendor: string | null
  architecture: string | null
  vramGb: number | null
  bandwidthTbps: number | null
  tflopsBf16: number | null
  tdpWatts: number | null
  gpusPerNode: number | null
}

/**
 * Per-model metadata returned by GET /models?include=specs.
 *
 * MoE detection:  num_experts != null && num_experts > 1
 * Vision model:   architecture?.endsWith('ForConditionalGeneration')
 */
export interface ModelSpec {
  id: string
  /** Total number of experts (null for dense models). */
  num_experts: number | null
  /** Experts activated per token — top-k (null for dense models). */
  num_experts_per_tok: number | null
  /** Maximum context window in tokens. */
  context_length: number | null
  /** Number of query attention heads. */
  num_attn_heads: number | null
  /** Number of KV heads (< num_attn_heads when GQA is used). */
  num_kv_heads: number | null
  /** Raw HuggingFace architecture class name. */
  architecture: string | null
}

export interface AicCatalog {
  gpuOptions: GpuOption[]
  modelOptions: string[]
  modelSpecs: Map<string, ModelSpec>
  isLoading: boolean
  error: string | null
}

const GB = 1_073_741_824

function mapSystem(s: Record<string, unknown>): GpuOption {
  const memBytes = typeof s.memory_bytes === 'number' ? s.memory_bytes : 0
  const bwBytes = typeof s.memory_bandwidth_bytes === 'number' ? s.memory_bandwidth_bytes : 0
  return {
    systemId: typeof s.id === 'string' ? s.id : '',
    label: typeof s.name === 'string' ? s.name : (typeof s.id === 'string' ? s.id : ''),
    vendor: typeof s.vendor === 'string' ? s.vendor : null,
    architecture: typeof s.architecture === 'string' ? s.architecture : null,
    vramGb: memBytes > 0 ? Math.round(memBytes / GB) : null,
    bandwidthTbps: bwBytes > 0 ? bwBytes / 1e12 : null,
    tflopsBf16: typeof s.bf16_tflops === 'number' && s.bf16_tflops > 0 ? s.bf16_tflops : null,
    tdpWatts: typeof s.tdp_watts === 'number' ? s.tdp_watts : null,
    gpusPerNode: typeof s.gpus_per_node === 'number' ? s.gpus_per_node : null,
  }
}

// Module-level cache — shared across all components, survives re-renders
// TTL of 10 minutes so new models appear without a hard refresh
const CACHE_TTL_MS = 10 * 60 * 1000
let cachedGpus: GpuOption[] | null = null
let cachedModels: string[] | null = null
let cachedModelSpecs: Map<string, ModelSpec> | null = null
let cacheTimestamp: number | null = null
let fetchPromise: Promise<void> | null = null

function isCacheValid(): boolean {
  return cachedGpus !== null && cachedModels !== null && cachedModelSpecs !== null &&
    cacheTimestamp !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS
}

export function useAicCatalog(): AicCatalog {
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>(isCacheValid() ? cachedGpus! : [])
  const [modelOptions, setModelOptions] = useState<string[]>(isCacheValid() ? cachedModels! : [])
  const [modelSpecs, setModelSpecs] = useState<Map<string, ModelSpec>>(isCacheValid() ? cachedModelSpecs! : new Map())
  const [isLoading, setIsLoading] = useState(!isCacheValid())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isCacheValid()) {
      setGpuOptions(cachedGpus!)
      setModelOptions(cachedModels!)
      setModelSpecs(cachedModelSpecs!)
      setIsLoading(false)
      return
    }

    fetchPromise = null  // reset so stale cache triggers a fresh fetch

    let cancelled = false
    const aicUrl = process.env.NEXT_PUBLIC_AICONFIGURATOR_API_URL || 'https://www.aiconfigurator.dev'

    async function fetchCatalog() {
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const [systemsRes, modelsRes] = await Promise.all([
            fetch(`${aicUrl}/systems?include=specs`),
            fetch(`${aicUrl}/models?include=specs`),
          ])

          if (!systemsRes.ok) throw new Error(`Systems fetch failed (${systemsRes.status})`)
          if (!modelsRes.ok) throw new Error(`Models fetch failed (${modelsRes.status})`)

          const systemsData = await systemsRes.json()
          const modelsData = await modelsRes.json()

          const systems = (systemsData.systems ?? []) as Record<string, unknown>[]
          const gpus = systems.map(mapSystem)

          const rawModels = (modelsData.models ?? []) as unknown[]
          const modelList: string[] = []
          const specsMap = new Map<string, ModelSpec>()
          for (const m of rawModels) {
            if (typeof m === 'string') {
              modelList.push(m)
            } else if (m && typeof m === 'object' && typeof (m as Record<string, unknown>).id === 'string') {
              const spec = m as ModelSpec
              modelList.push(spec.id)
              specsMap.set(spec.id, spec)
            }
          }

          if (gpus.length === 0 || modelList.length === 0) {
            throw new Error('AIC returned empty catalog')
          }

          cachedGpus = gpus
          cachedModels = modelList
          cachedModelSpecs = specsMap
          cacheTimestamp = Date.now()
        })()
      }

      try {
        await fetchPromise
        if (!cancelled) {
          setGpuOptions(cachedGpus!)
          setModelOptions(cachedModels!)
          setModelSpecs(cachedModelSpecs!)
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

  return { gpuOptions, modelOptions, modelSpecs, isLoading, error }
}
