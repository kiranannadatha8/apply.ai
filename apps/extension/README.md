# ApplyAI Browser Extension

This package contains the MVP browser extension that powers job page detection, AI-powered job analysis, and one-click apply capabilities.

## Key Features

- **Job detection banner** – Fast URL + DOM heuristics for Greenhouse, Lever, Workday, Ashby, SmartRecruiters, Taleo, Indeed, LinkedIn, BambooHR, and iCIMS. Low-confidence detections surface an _Assist to map_ CTA instead of silently failing.
- **Field extraction** – Normalises job title, company, location, job description, apply URL, and posting date from both DOM and JSON-LD payloads. Results feed the banner, AI analysis side panel, and Save/Apply pipelines.
- **AI analysis panel** – One click launches a side panel that scores match coverage, highlights missing keywords, generates editable bullet suggestions, and drafts a cover note. Outputs auto-save locally with telemetry for latency and token usage.
- **Autofill preview** – A React overlay inspects the active application form, maps profile data, previews field coverage, attaches resume variants, and optionally converts the cover note into a file. Users confirm before any form mutation and can mark the job as applied afterwards.
- **Offline-aware save/apply** – Extension background service queues Save/Apply requests when the network or ext token is unavailable, syncs later, and records audit telemetry.
- **Telemetry buffers** – Detection, AI analysis, autofill, and apply events are buffered locally and forwarded to the API when endpoints are configured.

## Development

```bash
pnpm install
pnpm --filter extension dev
```

The build output lives in `apps/extension/dist`. Load the directory as an unpacked extension in Chrome for local testing.

## Testing & QA

- `pnpm --filter extension build` – Type-checks and builds the MV3 bundle.
- Background logic relies on the ApplyAI API; ensure `VITE_API_URL` points to your backend when exercising Save/Apply flows.

## Notable Configurations

- Content scripts run with Tailwind-powered styling (`src/content/index.css`).
- Detection rules live under `src/lib/detectors` and can be extended per board.
- Autofill heuristics and resume library utilities live under `src/lib/autofill`.

Refer to inline comments for implementation details and guardrails.
