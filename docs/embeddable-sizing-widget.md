# Embeddable sizing widget

ConfigIQ publishes a framework-independent browser component at
`/widgets/configiq-sizing-widget-v1.js`. It adds ConfigIQ performance sizing to a
host application without adding another ConfigIQ page or copying sizing math.

The widget exposes exactly six inputs: model, GPU, input tokens, output tokens,
target concurrency, and target time to first token. Throughput, TTFT, and TPOT
come only from ConfigIQ. A failed or incomplete response produces an unavailable
state; there is no local fallback.

## Embed

```html
<script type="module" src="https://configiq.dev/widgets/configiq-sizing-widget-v1.js"></script>

<configiq-sizing-widget
  id="sizing"
  endpoint="/api/configiq"
  timeout-ms="27000"
></configiq-sizing-widget>

<script type="module">
  const widget = document.querySelector('#sizing');
  widget.config = {
    models: [
      {
        value: 'qwen-2.5-7b',
        label: 'Qwen 2.5 7B',
        modelPath: 'Qwen/Qwen2.5-7B-Instruct',
      },
    ],
    gpus: [
      { value: 'h200', label: 'NVIDIA H200', system: 'h200_sxm' },
    ],
    seed: {
      model: 'qwen-2.5-7b',
      gpu: 'h200',
      isl: 2048,
      osl: 512,
      concurrency: 10,
      ttft: 500,
    },
  };
</script>
```

The host owns option labels and maps its catalog identifiers to ConfigIQ's
`model_path` and `system` values. The widget owns validation, request timing,
loading/error/result states, and presentation.

## Endpoint contract

The default endpoint is ConfigIQ's same-origin `POST /api/recommend`. An
embedding application can set `endpoint` to its own same-origin server-side
proxy, as AI Architect does with `/api/configiq`. The default timeout is 95
seconds to accommodate ConfigIQ's API timeout. A host with a shorter proxy
deadline can set `timeout-ms` just above that deadline; AI Architect uses 27
seconds for its 25-second proxy.

The request is:

```json
{
  "model_path": "Qwen/Qwen2.5-7B-Instruct",
  "system": "h200_sxm",
  "isl": 2048,
  "osl": 512,
  "ttft": 500,
  "target_concurrency": 10
}
```

The widget accepts the direct ConfigIQ response or a host proxy wrapper shaped
as `{ "ok": true, "data": <ConfigIQ response> }`. It renders only finite,
non-negative values from `throughput.tokensPerSecond`,
`performance.ttftLatencyMs`, and `performance.tpotMs`.

## Runtime behavior

- Requests wait 500 ms after an edit.
- A new edit aborts the previous request and invalidates any late response.
- Token, concurrency, and latency inputs are positive integers.
- Styles are isolated in an open shadow root and do not depend on PatternFly or
  the host application's CSS.
- The module is served with cross-origin resource headers so other Red Hat web
  properties can load it directly.
- Reassigning an equivalent `config` object does not rebuild the component or
  discard a user's in-progress edits. A materially changed model/GPU catalog or
  seed intentionally resets the fields to the new host state.

## Local AI Architect smoke test

Run ConfigIQ on port 3100, serve this repository on port 4178, and open
`tests/widgets/fixtures/ai-architect-embed.html`. The fixture loads the real
cross-origin module and supplies AI Architect-shaped catalog seeds. Its
`/api/configiq` request must be provided by a same-origin test stub or the AI
Architect proxy.
