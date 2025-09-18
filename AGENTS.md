# Repository Guidelines

## Project Structure & Module Organization
The Next.js frontend lives in `src/app` with `layout.tsx` defining global structure and `page.tsx` hosting the generative UI demo. Shared domain logic sits in `src/lib` (submodules: `constants`, `store`, `types`, `utils`). Unit test fixtures reside in `src/lib/store/__tests__`. Static assets belong in `public/`. Tailwind config and UI kit tokens are tracked in `components.json` and `globals.css`.

## Build, Test, and Development Commands
Install dependencies once with `bun install`. Use `bun run dev` for the Turbopack dev server at `http://localhost:3000`. Ship builds via `bun run build` and smoke them with `bun run start`. Quality gates: `bun run lint` for ESLint, `bun run lint:fix` to autofix, and `bun run typecheck` for strict TypeScript validation.

## Coding Style & Naming Conventions
ESLint and Prettier format TypeScript + React with 2-space indentation and double-quoted strings aligned to Next.js defaults. Prefer functional components, PascalCase file names under `src/app`, and camelCase for helpers in `src/lib`. Follow the enforced import order (builtin → external → internal, blank line separated) and keep Tailwind utility classes grouped by layout → spacing → typography for readability. Warn-level rules allow placeholder `_unused` symbols; remove debug `console.log` before committing.

## Testing Guidelines
Tests use Jest with `ts-jest`. Co-locate specs next to the code in `__tests__` directories or name them `*.test.ts`. Run suites with `bunx jest` (add `--coverage` when touching business logic, using the auto-selected files listed in `jest.config.js`). Mock network or OpenAI calls via module stubs in `src/lib` to keep tests deterministic. Update fixtures rather than mutating shared state.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (e.g. `feat: add session store events`). Keep subjects ≤72 chars and describe what changed, not how. Each PR should summarize rationale, list validation commands (`bun run lint`, `bun run typecheck`, `bunx jest`), and link the relevant phase/task document. Include before/after screenshots when tweaking UI and note any follow-up issues so downstream agents can sequence their work.
