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
  heading-level="2"
  theme="dark"
  full-url="https://configiq.dev/performance"
  full-label="Open full Configurator"
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

## Ownership and contribution rules

The component is a small ConfigIQ product surface, not host-specific markup.
Changes should preserve these boundaries:

- One component has one primary task. This component validates performance for
  a chosen model, GPU, and workload; recommendation, cost, and KV-cache tools
  should be separate components that a future workbench can compose.
- Rich data enters through the `config` JavaScript property. Attributes remain
  small declarative settings such as endpoint, timeout, theme, and full-tool
  link.
- ConfigIQ owns controls, validation, request lifecycle, accessible status
  announcements, results, and native responsive layout.
- A host owns catalog mapping, its same-origin proxy, initial seed values, and
  optional semantic theme tokens. It must not copy the component source or
  depend on shadow-DOM class names.
- Editing the widget is exploratory. A host must require an explicit user action
  before applying widget inputs or results to another application's saved plan.
- New public properties, attributes, events, CSS tokens, or parts require
  documentation and compatibility tests. Breaking changes use a new major
  component URL instead of silently changing V1.

Use native HTML controls and visible labels where possible. Keyboard focus,
error text, loading state, and result announcements must work without relying
on color. Every visual change needs desktop and mobile evidence for the native
component; host screenshots are integration proof, not the styling authority.

## Host integration

The default visual treatment follows ConfigIQ's light application surfaces.
Dark hosts can set `theme="dark"`; AI Architect uses this mode. Hosts needing a
closer fit can override the documented `--configiq-widget-*` CSS custom
properties without reaching into the shadow DOM. This lets the component follow
host design-token changes while ConfigIQ continues to own its spacing,
hierarchy, states, and accessible contrast.

`full-url` is optional. When present, the header shows a secondary link to the
complete ConfigIQ workflow. The component keeps its `model` and `system` query
parameters aligned with the current selections; `full-label` overrides the
default link text. Only HTTP(S) destinations are rendered.
ConfigIQ's existing `/performance` page validates and applies those two query
parameters, then falls back to its normal settings and catalog defaults when a
value is absent or invalid.

Common visual tokens include `--configiq-widget-surface`,
`--configiq-widget-surface-subtle`, `--configiq-widget-text`,
`--configiq-widget-text-muted`, `--configiq-widget-border`, and
`--configiq-widget-accent`. These semantic tokens are the supported host styling
API; hosts should not depend on shadow-DOM class names.

The default ConfigIQ theme remains the reference design. A host may map the
documented semantic tokens to its own design system, but should not replace the
component's information hierarchy, spacing model, control behavior, or state
semantics. This keeps the widget recognizable and maintainable while allowing
it to sit naturally inside another product.

The component labels itself as IQ Configurator so users can identify the source
of its sizing results. Set `heading-level` from `1` through `6` to match the
host page's heading hierarchy; the default is `2`.

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
- The V1 URL is a backward-compatible release channel. Browsers revalidate it;
  shared caches retain it for at most five minutes, so fixes can reach hosts
  without an immutable browser cache.
- Reassigning an equivalent `config` object does not rebuild the component or
  discard a user's in-progress edits. A materially changed model/GPU catalog or
  seed intentionally resets the fields to the new host state.

## Screenshot evidence

The committed evidence set is intentionally small:

| Evidence | Desktop | Mobile |
| --- | --- | --- |
| ConfigIQ-native success | `configiq-native-success-1440.jpg` | `configiq-native-success-375.jpg` |
| Real AI Architect host | `ai-architect-host-1440.png` | `ai-architect-host-375.png` |
| Missing required context | `configiq-native-empty-1440.jpg` | Covered by responsive tests |
| Upstream unavailable, no fallback result | `configiq-native-error-1440.jpg` | Covered by responsive tests |

Native screenshots establish ConfigIQ styling. Real-host screenshots prove that
the same component integrates without copied controls or CSS. Test fixtures must
not be labeled as screenshots of a real host application.

## Local host smoke test

Run ConfigIQ on port 3100, serve this repository on port 4178, and open
`tests/widgets/fixtures/configiq-sizing-widget-host.html`. The generic fixture
loads the real cross-origin module and supplies a representative host catalog
and seed. Its `/api/configiq` request must be provided by a same-origin test stub
or host proxy. It is a contract preview, not a screenshot of AI Architect or
another production application.
