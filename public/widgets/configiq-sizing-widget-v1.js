const DEFAULTS = Object.freeze({
  isl: 2048,
  osl: 512,
  concurrency: 10,
  ttft: 500,
});

const HTMLElementBase = globalThis.HTMLElement ?? class {};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function positiveInteger(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function strictPositiveInteger(value) {
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateSizingValues(values) {
  return ['isl', 'osl', 'concurrency', 'ttft'].filter(
    (field) => strictPositiveInteger(values[field]) === null,
  );
}

export function buildSizingRequest(config, values) {
  const model = config.models.find((item) => item.value === values.model);
  const gpu = config.gpus.find((item) => item.value === values.gpu);

  const isl = strictPositiveInteger(values.isl);
  const osl = strictPositiveInteger(values.osl);
  const ttft = strictPositiveInteger(values.ttft);
  const concurrency = strictPositiveInteger(values.concurrency);

  if (!model?.modelPath || !gpu?.system || [isl, osl, ttft, concurrency].includes(null)) return null;

  return {
    model_path: model.modelPath,
    system: gpu.system,
    isl,
    osl,
    ttft,
    target_concurrency: concurrency,
  };
}

export function normalizeSizingResponse(payload) {
  if (payload?.ok === false) return null;
  const isProxyWrapper = payload?.ok === true;
  const candidate = isProxyWrapper ? payload.data : payload;
  if (!candidate) return null;
  if (!isProxyWrapper && candidate.status !== 'completed') return null;
  if (isProxyWrapper && candidate.status !== undefined && candidate.status !== 'completed') return null;

  const tokensPerSecond = candidate.throughput?.tokensPerSecond;
  const ttftLatencyMs = candidate.performance?.ttftLatencyMs;
  const tpotMs = candidate.performance?.tpotMs;

  if (![tokensPerSecond, ttftLatencyMs, tpotMs].every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }

  return { tokensPerSecond, ttftLatencyMs, tpotMs };
}

function optionMarkup(items, selected) {
  return items.map((item) => (
    `<option value="${escapeHtml(item.value)}"${item.value === selected ? ' selected' : ''}>${escapeHtml(item.label || item.value)}</option>`
  )).join('');
}

const styles = `
  :host {
    --ciq-accent: #0066cc;
    --ciq-accent-strong: #004b95;
    --ciq-accent-soft: #e7f1fa;
    --ciq-teal: #007a87;
    --ciq-ink: #151515;
    --ciq-muted: #3c3f42;
    --ciq-caption: #54585c;
    --ciq-border: #d2d2d2;
    --ciq-surface: #ffffff;
    --ciq-surface-subtle: #f7f7f8;
    color: var(--ciq-ink);
    display: block;
    font-family: "Red Hat Text", "Plus Jakarta Sans", system-ui, sans-serif;
    line-height: 1.5;
  }
  * { box-sizing: border-box; }
  .shell {
    background: var(--ciq-surface);
    border: 1px solid var(--ciq-border);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgb(21 21 21 / 8%);
    overflow: hidden;
  }
  .header {
    background: linear-gradient(115deg, #002f5d 0%, #005f73 100%);
    color: #fff;
    display: grid;
    gap: 6px;
    padding: 22px 24px;
  }
  .eyebrow {
    color: #c9e8ff;
    font-family: "Red Hat Mono", "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
  }
  h2 { font-size: 22px; font-weight: 600; line-height: 1.2; margin: 0; }
  .intro { color: #eef7fb; font-size: 14px; margin: 0; max-width: 72ch; }
  .content { display: grid; gap: 22px; padding: 24px; }
  .inputs { display: grid; gap: 16px; grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .field { display: grid; gap: 6px; grid-column: span 3; }
  .field.wide { grid-column: span 6; }
  label { color: var(--ciq-ink); font-size: 13px; font-weight: 600; }
  input, select {
    appearance: none;
    background: #fff;
    border: 1px solid #8a8d90;
    border-radius: 6px;
    color: var(--ciq-ink);
    font: inherit;
    font-size: 14px;
    min-height: 42px;
    padding: 9px 11px;
    width: 100%;
  }
  select {
    background-image: linear-gradient(45deg, transparent 50%, #3c3f42 50%), linear-gradient(135deg, #3c3f42 50%, transparent 50%);
    background-position: calc(100% - 16px) 18px, calc(100% - 11px) 18px;
    background-repeat: no-repeat;
    background-size: 5px 5px, 5px 5px;
    padding-right: 32px;
  }
  input:focus, select:focus { border-color: var(--ciq-accent); box-shadow: 0 0 0 3px rgb(0 102 204 / 18%); outline: 0; }
  .hint { color: var(--ciq-caption); font-size: 11.5px; line-height: 1.35; }
  .results { border-top: 1px solid var(--ciq-border); padding-top: 20px; }
  .status {
    background: var(--ciq-surface-subtle);
    border-left: 4px solid var(--ciq-accent);
    color: var(--ciq-muted);
    font-size: 14px;
    margin: 0;
    padding: 14px 16px;
  }
  .status.error { background: #fff8e5; border-color: #f0ab00; color: #4f3800; }
  .stats { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stat {
    background: var(--ciq-surface-subtle);
    border: 1px solid var(--ciq-border);
    border-top: 3px solid var(--ciq-teal);
    border-radius: 8px;
    display: grid;
    gap: 4px;
    padding: 16px;
  }
  .stat.primary { background: var(--ciq-accent-soft); border-color: #73bcf7; border-top-color: var(--ciq-accent); }
  .value {
    color: var(--ciq-ink);
    font-family: "Red Hat Display", "Plus Jakarta Sans", sans-serif;
    font-size: 28px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1.1;
  }
  .unit { color: var(--ciq-muted); font-family: "Red Hat Text", sans-serif; font-size: 13px; font-weight: 500; margin-left: 5px; white-space: nowrap; }
  .metric { color: var(--ciq-muted); font-size: 12.5px; font-weight: 600; }
  .attribution { color: var(--ciq-caption); font-size: 11.5px; margin: 10px 0 0; }
  .attribution a { color: var(--ciq-accent-strong); }
  @media (max-width: 720px) {
    .header, .content { padding: 18px; }
    .inputs { grid-template-columns: 1fr; }
    .field, .field.wide { grid-column: auto; }
    .stats { grid-template-columns: 1fr; }
  }
`;

function fieldMarkup({ id, field, label, hint, value, max = 1000000 }) {
  const hintId = `${id}-hint`;
  return `
    <div class="field">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <input id="${escapeHtml(id)}" data-field="${escapeHtml(field)}" type="number" min="1" max="${escapeHtml(max)}" step="1" value="${escapeHtml(value)}" required aria-required="true" aria-describedby="${escapeHtml(hintId)}">
      <span class="hint" id="${escapeHtml(hintId)}">${escapeHtml(hint)}</span>
    </div>`;
}

export class ConfigIqSizingWidget extends HTMLElementBase {
  #config = { models: [], gpus: [], seed: {} };
  #requestToken = 0;
  #timer = null;
  #controller = null;
  #configSignature = '';

  constructor() {
    super();
    if (this.attachShadow) this.attachShadow({ mode: 'open' });
  }

  set config(value) {
    const nextConfig = {
      models: Array.isArray(value?.models) ? value.models : [],
      gpus: Array.isArray(value?.gpus) ? value.gpus : [],
      seed: value?.seed && typeof value.seed === 'object' ? value.seed : {},
    };
    const nextSignature = JSON.stringify(nextConfig);
    if (nextSignature === this.#configSignature) return;
    this.#config = nextConfig;
    this.#configSignature = nextSignature;
    if (this.isConnected) this.render();
  }

  get config() { return this.#config; }

  connectedCallback() { this.render(); }

  disconnectedCallback() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#controller?.abort();
    this.#timer = null;
    this.#controller = null;
  }

  render() {
    if (!this.shadowRoot) return;
    const seed = this.#config.seed;
    const selectedModel = seed.model ?? seed.modelId ?? '';
    const selectedGpu = seed.gpu ?? seed.gpuType ?? '';
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="shell" aria-label="IQ Configurator performance sizing">
        <header class="header">
          <span class="eyebrow">IQ Configurator</span>
          <h2>Performance sizing</h2>
          <p class="intro">Adjust six workload inputs to get live throughput and latency from ConfigIQ.</p>
        </header>
        <div class="content">
          <div class="inputs" role="group" aria-label="Sizing inputs">
            <div class="field wide">
              <label for="model">Model</label>
              <select id="model" data-field="model" required aria-required="true" aria-describedby="model-hint">
                <option value="">Select a model…</option>
                ${optionMarkup(this.#config.models, selectedModel)}
              </select>
              <span class="hint" id="model-hint">The model you plan to serve.</span>
            </div>
            <div class="field wide">
              <label for="gpu">GPU</label>
              <select id="gpu" data-field="gpu" required aria-required="true" aria-describedby="gpu-hint">
                <option value="">Select a GPU…</option>
                ${optionMarkup(this.#config.gpus, selectedGpu)}
              </select>
              <span class="hint" id="gpu-hint">The accelerator this workload runs on.</span>
            </div>
            ${fieldMarkup({ id: 'isl', field: 'isl', label: 'Input tokens', hint: 'Typical prompt length.', value: positiveInteger(seed.isl ?? seed.islTokens, DEFAULTS.isl) })}
            ${fieldMarkup({ id: 'osl', field: 'osl', label: 'Output tokens', hint: 'Typical response length.', value: positiveInteger(seed.osl ?? seed.oslTokens, DEFAULTS.osl) })}
            ${fieldMarkup({ id: 'concurrency', field: 'concurrency', label: 'Target concurrency', hint: 'Requests running at the same time.', value: positiveInteger(seed.concurrency, DEFAULTS.concurrency) })}
            ${fieldMarkup({ id: 'ttft', field: 'ttft', label: 'Target time to first token (ms)', hint: 'Maximum time to the first token.', value: positiveInteger(seed.ttft ?? seed.ttftMs, DEFAULTS.ttft), max: 600000 })}
          </div>
          <div class="results" aria-live="polite"></div>
        </div>
      </section>`;

    this.shadowRoot.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => this.schedule());
    });
    this.schedule(0);
  }

  values() {
    const value = (name) => this.shadowRoot?.querySelector(`[data-field="${name}"]`)?.value ?? '';
    return {
      model: value('model'), gpu: value('gpu'), isl: value('isl'), osl: value('osl'),
      concurrency: value('concurrency'), ttft: value('ttft'),
    };
  }

  schedule(delay = 500) {
    this.#requestToken += 1;
    const token = this.#requestToken;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#controller?.abort();
    this.#controller = null;

    const values = this.values();
    if (!values.model || !values.gpu) {
      this.showStatus(values.model ? 'Choose a GPU to size this workload.' : 'Choose a model to size this workload.');
      return;
    }

    const invalidFields = validateSizingValues(values);
    this.shadowRoot?.querySelectorAll('input[data-field]').forEach((input) => {
      input.setAttribute('aria-invalid', String(invalidFields.includes(input.dataset.field)));
    });
    if (invalidFields.length) {
      this.showInputError();
      return;
    }

    this.showStatus('Sizing with ConfigIQ…');
    this.#timer = setTimeout(() => void this.request(values, token), delay);
  }

  async request(values, token) {
    const payload = buildSizingRequest(this.#config, values);
    if (!payload) {
      this.showError();
      return;
    }

    const controller = new AbortController();
    this.#controller = controller;
    const timeoutMs = positiveInteger(this.getAttribute('timeout-ms'), 95000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.getAttribute('endpoint') || '/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = response.ok ? await response.json() : null;
      const result = normalizeSizingResponse(body);
      if (token !== this.#requestToken) return;
      if (!result) this.showError();
      else this.showResult(result);
    } catch {
      if (token === this.#requestToken) this.showError();
    } finally {
      clearTimeout(timeout);
      if (this.#controller === controller) this.#controller = null;
    }
  }

  showStatus(message) {
    const results = this.shadowRoot?.querySelector('.results');
    if (results) results.innerHTML = `<p class="status">${escapeHtml(message)}</p>`;
  }

  showError() {
    const results = this.shadowRoot?.querySelector('.results');
    if (results) results.innerHTML = '<p class="status error">Sizing is unavailable right now. ConfigIQ did not return a usable result. Try again in a moment.</p>';
  }

  showInputError() {
    const results = this.shadowRoot?.querySelector('.results');
    if (results) results.innerHTML = '<p class="status error">Enter a positive whole number in every numeric field to request sizing.</p>';
  }

  showResult(result) {
    const metric = (label, value, unit, primary = false) => `
      <div class="stat${primary ? ' primary' : ''}">
        <strong class="value">${Math.round(value)}<span class="unit">${escapeHtml(unit)}</span></strong>
        <span class="metric">${escapeHtml(label)}</span>
      </div>`;
    const results = this.shadowRoot?.querySelector('.results');
    if (results) results.innerHTML = `
      <div class="stats">
        ${metric('Throughput', result.tokensPerSecond, 'tokens/s', true)}
        ${metric('Time to first token', result.ttftLatencyMs, 'ms')}
        ${metric('Time per output token', result.tpotMs, 'ms')}
      </div>
      <p class="attribution">Live sizing from <a href="https://configiq.dev/recommend" target="_blank" rel="noopener noreferrer">ConfigIQ</a>.</p>`;
  }
}

if (globalThis.customElements && !globalThis.customElements.get('configiq-sizing-widget')) {
  globalThis.customElements.define('configiq-sizing-widget', ConfigIqSizingWidget);
}
