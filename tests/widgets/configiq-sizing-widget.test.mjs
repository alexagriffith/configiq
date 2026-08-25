// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import {
  buildSizingRequest,
  normalizeSizingResponse,
  validateSizingValues,
} from '../../public/widgets/configiq-sizing-widget-v1.js';

const config = {
  models: [{ value: 'qwen', label: 'Qwen 2.5 7B', modelPath: 'Qwen/Qwen2.5-7B-Instruct' }],
  gpus: [{ value: 'h200', label: 'NVIDIA H200', system: 'h200_sxm' }],
};

function mountWidget(overrides = {}) {
  const widget = document.createElement('configiq-sizing-widget');
  widget.config = {
    ...config,
    seed: { model: 'qwen', gpu: 'h200', isl: 2048, osl: 512, concurrency: 10, ttft: 500 },
    ...overrides,
  };
  widget.setAttribute('endpoint', '/api/configiq');
  document.body.append(widget);
  return widget;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe('ConfigIQ sizing widget contract', () => {
  it('maps the six user inputs to the ConfigIQ request contract', () => {
    expect(buildSizingRequest(config, {
      model: 'qwen', gpu: 'h200', isl: '2048', osl: 512,
      concurrency: 10, ttft: 500,
    })).toEqual({
      model_path: 'Qwen/Qwen2.5-7B-Instruct',
      system: 'h200_sxm',
      isl: 2048,
      osl: 512,
      ttft: 500,
      target_concurrency: 10,
    });
  });

  it('does not build a request until both model and GPU resolve', () => {
    expect(buildSizingRequest(config, { model: 'qwen', gpu: '' })).toBeNull();
    expect(buildSizingRequest(config, { model: '', gpu: 'h200' })).toBeNull();
    expect(buildSizingRequest(config, { model: 'unknown', gpu: 'h200' })).toBeNull();
  });

  it('rejects invalid live numeric values instead of substituting hidden defaults', () => {
    for (const invalid of ['', 0, -1, 1.5, '2.5']) {
      const values = { model: 'qwen', gpu: 'h200', isl: invalid, osl: 512, concurrency: 10, ttft: 500 };
      expect(buildSizingRequest(config, values)).toBeNull();
      expect(validateSizingValues(values)).toContain('isl');
    }
  });

  it('accepts direct ConfigIQ responses and host-proxy wrappers', () => {
    const data = {
      status: 'completed',
      throughput: { tokensPerSecond: 7156.9 },
      performance: { ttftLatencyMs: 145.2, tpotMs: 28.8 },
    };
    const expected = { tokensPerSecond: 7156.9, ttftLatencyMs: 145.2, tpotMs: 28.8 };
    expect(normalizeSizingResponse(data)).toEqual(expected);
    expect(normalizeSizingResponse({ ok: true, data })).toEqual(expected);
  });

  it('fails closed on errors, missing values, and negative metrics', () => {
    expect(normalizeSizingResponse({ status: 'failed' })).toBeNull();
    expect(normalizeSizingResponse({ ok: false })).toBeNull();
    expect(normalizeSizingResponse({
      throughput: { tokensPerSecond: -1 },
      performance: { ttftLatencyMs: 145, tpotMs: 29 },
    })).toBeNull();
    expect(normalizeSizingResponse({ throughput: {}, performance: {} })).toBeNull();
    expect(normalizeSizingResponse({
      status: 'pending',
      throughput: { tokensPerSecond: 7157 },
      performance: { ttftLatencyMs: 145, tpotMs: 29 },
    })).toBeNull();
    expect(normalizeSizingResponse({
      status: 'completed',
      throughput: { tokensPerSecond: null },
      performance: { ttftLatencyMs: '', tpotMs: false },
    })).toBeNull();
    expect(normalizeSizingResponse({
      ok: true,
      data: {
        status: 'failed',
        throughput: { tokensPerSecond: 7157 },
        performance: { ttftLatencyMs: 145, tpotMs: 29 },
      },
    })).toBeNull();
    expect(normalizeSizingResponse({
      ok: true,
      data: {
        status: null,
        throughput: { tokensPerSecond: 7157 },
        performance: { ttftLatencyMs: 145, tpotMs: 29 },
      },
    })).toBeNull();
  });
});

describe('ConfigIQ sizing widget lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders exactly the six documented inputs and associated help', () => {
    const widget = mountWidget();
    const fields = [...widget.shadowRoot.querySelectorAll('[data-field]')].map((item) => item.dataset.field);
    expect(fields).toEqual(['model', 'gpu', 'isl', 'osl', 'concurrency', 'ttft']);
    expect(widget.shadowRoot.textContent).not.toMatch(/parameters|precision/i);
    for (const control of widget.shadowRoot.querySelectorAll('[data-field]')) {
      expect(control.getAttribute('aria-describedby')).toBeTruthy();
      expect(widget.shadowRoot.getElementById(control.getAttribute('aria-describedby'))).toBeTruthy();
    }
  });

  it('keeps equivalent reactive config assignments from resetting user edits', () => {
    const widget = mountWidget();
    const concurrency = widget.shadowRoot.querySelector('[data-field="concurrency"]');
    concurrency.value = '37';
    widget.config = {
      gpus: widget.config.gpus.map(({ value, label, system }) => ({ system, label, value })),
      seed: {
        ttft: 500,
        concurrency: 10,
        osl: 512,
        isl: 2048,
        gpu: 'h200',
        model: 'qwen',
      },
      models: widget.config.models.map(({ value, label, modelPath }) => ({ modelPath, label, value })),
    };
    expect(widget.shadowRoot.querySelector('[data-field="concurrency"]').value).toBe('37');
  });

  it('keeps widget instances isolated', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { throughput: { tokensPerSecond: 100 }, performance: { ttftLatencyMs: 20, tpotMs: 5 } } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const first = mountWidget();
    const second = mountWidget({ seed: { model: 'qwen', gpu: 'h200', isl: 4096, osl: 256, concurrency: 20, ttft: 800 } });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.shadowRoot.textContent).toContain('100');
    expect(second.shadowRoot.textContent).toContain('100');
  });

  it('drops an out-of-order response after the user edits an input', async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);
    vi.stubGlobal('fetch', fetchMock);
    const widget = mountWidget();
    await vi.advanceTimersByTimeAsync(0);

    const concurrency = widget.shadowRoot.querySelector('[data-field="concurrency"]');
    concurrency.value = '20';
    concurrency.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(500);

    newRequest.resolve({
      ok: true,
      json: async () => ({ ok: true, data: { throughput: { tokensPerSecond: 200 }, performance: { ttftLatencyMs: 30, tpotMs: 6 } } }),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(widget.shadowRoot.textContent).toContain('200');

    oldRequest.resolve({
      ok: true,
      json: async () => ({ ok: true, data: { throughput: { tokensPerSecond: 50 }, performance: { ttftLatencyMs: 90, tpotMs: 12 } } }),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(widget.shadowRoot.textContent).toContain('200');
    expect(widget.shadowRoot.textContent).not.toContain('50tokens/s');
  });
});
