# Generative UI Onboarding

A Phase 1 proof-of-concept for an adaptive onboarding flow driven by deterministic rules. The app is built with Next.js 15, TypeScript, shadcn/ui, and bun, and lays the groundwork for an AI-augmented experience in later phases.

## Prerequisites
- Node.js 18.17 or newer
- [Bun](https://bun.sh/) 1.1+
- An `.env.local` file with the values documented in `IMP.md` (OpenAI keys are optional for Phase 1).

Install dependencies once:
```bash
bun install
```

## Running Locally
```bash
# Standard dev build
bun run dev

# Dev server with the debug inspector enabled
bun run dev:debug
```
Visit `http://localhost:3000/onboarding` to exercise the adaptive flow. The metrics dashboard lives at `/metrics`.

## Core Scripts
Task automation is standardized through bun scripts:
- `bun run build` – production bundle with Next.js Turbopack.
- `bun run start` – start the compiled build.
- `bun run lint` / `bun run lint:fix` – ESLint with the repo configuration.
- `bun run typecheck` – TypeScript project validation.
- `bun run test` / `bun run test:watch` / `bun run test:coverage` – Jest unit suite.
- `bun run format` / `bun run format:check` – Prettier formatting helpers.
- `bun run check` – runs linting, type-checking, and tests in sequence.

## Debug Inspector
The new debug panel surfaces session IDs, plan sources, and the latest plan payload. It is rendered when either `NODE_ENV=development` or `NEXT_PUBLIC_DEBUG=true`. Enable it globally by adding the flag to `.env.local`, or launch a one-off session with `bun run dev:debug`.

## Testing & QA Flow
1. `bun run check` before submitting changes.
2. Navigate the onboarding flow, ensuring telemetry captures step changes without errors in the console.
3. Confirm `/api/plan` returns `{ plan, source }` using your session ID (see debug inspector for quick access).

## Troubleshooting
- **ESLint Next.js warning:** The project uses a custom configuration. Run `bun run lint` to verify and ignore Next.js telemetry prompts.
- **Missing session or plan data:** Clear `sessionStorage` in your browser and refresh. A new session will be provisioned automatically.
- **Environment variables:** If the app fails to fetch plans, ensure `.env.local` is present and matches the constants referenced in `IMP.md`.
