// Stub — implement when inference config engine is built

export interface InferenceRequest {
  model_name?: string
  model?: string
  system?: string
  gpu_type?: string
  isl?: number
  osl?: number
  concurrent_users?: number
  hf_token?: string | null
  hf_config?: Record<string, unknown>
  [key: string]: unknown
}

export interface InferenceConfigResult {
  memory_analysis: {
    weight_gb: number
    weight_gb_per_gpu: number
    total_vram_gb: number
    usable_hbm_per_gpu: number
    tp_size: number
    replicas: number
    kv_cache_budget_gb: number
    kv_cache_used_gb: number
    max_sequences_from_memory: number
    kv_category: string
    kv_category_label: string
  }
  vllm_config: {
    tensor_parallel_size: number
    max_model_len: number
    max_num_seqs: number
    gpu_memory_utilization: number
    max_num_batched_tokens: number
    enable_chunked_prefill: boolean
    enable_prefix_caching: boolean
    quantization: string
  }
  parallelism_strategy: {
    strategy: string
    pp_size: number
    topology_note: string
  }
  bottleneck_analysis: {
    primary: 'TTFT' | 'TPOT' | 'THROUGHPUT' | 'MIXED'
    risk: string
    fix_suggestions: string[]
  }
  diagnostics: {
    nvidia_smi_watch: string
    dcgm_metrics: string[]
    vllm_metrics: string[]
  }
  warnings: string[]
}
