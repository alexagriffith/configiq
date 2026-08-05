/**
 * Adapter that calls the AIC /recommend API and converts the response
 * into the InferenceConfigResult shape used by Quick Estimate.
 */

import type { InferenceConfigResult } from '@/lib/gpu-math/inference-config/types'
import { GPU_CATALOG } from '@/lib/gpu-math/gpus'

interface RecommendAdapterInput {
  model_path: string
  system: string
  isl: number
  osl: number
  concurrent_users: number
  backend?: string
}

interface AicConfig {
  total_gpus_needed?: number
  replicas_needed?: number
  num_total_gpus?: number
  tp?: number
  pp?: number
  dp?: number
  ttft?: number
  tpot?: number
  request_latency?: number
  concurrency?: number
  tokens_per_second?: number
  tokens_per_second_per_gpu?: number
  memory?: number
  backend?: string
  backend_version?: string
  gemm?: string
  kvcache?: string
  serving_config?: {
    backend: string
    tensor_parallel_size: number
    max_model_len: number
    max_num_seqs: number
    gpu_memory_utilization: number
    enable_chunked_prefill: boolean
    enable_prefix_caching: boolean
    quantization: string
  }
  memory_breakdown?: {
    weights_bytes: number
    activations_bytes: number
    runtime_overhead_bytes: number
    comm_overhead_bytes: number
    kv_cache_bytes: number
  }
}

const GB = 1_073_741_824

function gpuVramGb(systemId: string): number {
  const gpu = GPU_CATALOG.find(g => g.sizer_system_id === systemId)
  return gpu?.vram_gb ?? 141
}

function deriveBottleneck(ttft: number, tpot: number): {
  primary: 'TTFT' | 'TPOT' | 'THROUGHPUT' | 'MIXED'
  risk: string
  fix_suggestions: string[]
} {
  if (ttft > 2000) {
    return {
      primary: 'TTFT',
      risk: 'High TTFT — users will notice slow first-token response.',
      fix_suggestions: ['Increase TP to reduce prefill latency', 'Use chunked prefill'],
    }
  }
  if (tpot > 50) {
    return {
      primary: 'TPOT',
      risk: 'High TPOT — generation will feel slow.',
      fix_suggestions: ['Reduce concurrency', 'Use a smaller quantization (FP8)'],
    }
  }
  return {
    primary: 'THROUGHPUT',
    risk: 'Balanced — no single bottleneck dominates.',
    fix_suggestions: [],
  }
}

export async function fetchRecommendAsInferenceResult(
  input: RecommendAdapterInput
): Promise<InferenceConfigResult> {
  const res = await fetch('/api/recommend?include=config,memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_path: input.model_path,
      system: input.system,
      backend: input.backend ?? 'vllm',
      isl: input.isl,
      osl: input.osl,
      ttft: 2000,
      tpot: 30,
      target_concurrency: input.concurrent_users,
    }),
  })

  const data = await res.json()

  if (data.status === 'failed') {
    throw new Error(data.error?.message ?? 'AIC recommendation failed')
  }

  const configs = data.configs as AicConfig[] | undefined
  if (!configs || configs.length === 0) {
    throw new Error('No GPU configuration found for this model and hardware combination.')
  }

  const best = configs[0]
  const sc = best.serving_config
  const mb = best.memory_breakdown
  const tp = best.tp ?? sc?.tensor_parallel_size ?? best.num_total_gpus ?? 1
  const pp = best.pp ?? 1
  const replicas = best.replicas_needed ?? 1
  const totalVramGb = gpuVramGb(input.system)
  const gmu = sc?.gpu_memory_utilization ?? 0.9
  const weightGb = mb ? mb.weights_bytes / GB : (best.memory ?? 0) * 0.5
  const kvCacheGb = mb ? mb.kv_cache_bytes / GB : 0
  const usablePerGpu = totalVramGb * gmu

  return {
    memory_analysis: {
      weight_gb: weightGb,
      weight_gb_per_gpu: weightGb / tp,
      total_vram_gb: totalVramGb,
      usable_hbm_per_gpu: usablePerGpu,
      tp_size: tp,
      replicas,
      kv_cache_budget_gb: usablePerGpu - (weightGb / tp),
      kv_cache_used_gb: kvCacheGb,
      max_sequences_from_memory: sc?.max_num_seqs ?? best.concurrency ?? 128,
      kv_category: 'AIC',
      kv_category_label: 'AIConfigurator estimate',
    },
    vllm_config: {
      tensor_parallel_size: sc?.tensor_parallel_size ?? tp,
      max_model_len: sc?.max_model_len ?? (input.isl + input.osl),
      max_num_seqs: sc?.max_num_seqs ?? Math.min(best.concurrency ?? 128, 256),
      gpu_memory_utilization: sc?.gpu_memory_utilization ?? gmu,
      max_num_batched_tokens: (sc?.max_model_len ?? (input.isl + input.osl)) * (sc?.max_num_seqs ?? 128),
      enable_chunked_prefill: sc?.enable_chunked_prefill ?? false,
      enable_prefix_caching: sc?.enable_prefix_caching ?? false,
      quantization: sc?.quantization ?? 'auto',
    },
    parallelism_strategy: {
      strategy: pp > 1 ? 'PP_ACROSS_NODES' : 'TP_ONLY',
      pp_size: pp,
      topology_note: `TP=${tp}, PP=${pp}, DP=${best.dp ?? 1}, replicas=${replicas}`,
    },
    bottleneck_analysis: deriveBottleneck(best.ttft ?? 0, best.tpot ?? 0),
    diagnostics: {
      nvidia_smi_watch: 'nvidia-smi dmon -s pucvmet -d 1',
      dcgm_metrics: ['DCGM_FI_PROF_GR_ENGINE_ACTIVE', 'DCGM_FI_DEV_FB_USED'],
      vllm_metrics: ['vllm:num_requests_running', 'vllm:gpu_cache_usage_perc'],
    },
    warnings: [],
  }
}
