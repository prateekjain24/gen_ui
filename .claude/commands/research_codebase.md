# Research Codebase - Generative UI POC

You are tasked with conducting comprehensive research across this AI-orchestrated adaptive onboarding flow codebase. This project uses Next.js 15.4, TypeScript, AI SDK 5, and shadcn/ui to dynamically determine UI components based on user context through a Decision Cascade architecture (Rules Engine → LLM Director → Fallback).

## Initial Setup:

When this command is invoked, respond with:
```
I'm ready to research the Generative UI codebase. Please provide your research question about:
- Form rendering and dynamic UI flow orchestration
- Decision Cascade architecture (Rules → LLM → Fallback)
- Session management and telemetry tracking
- Type system (discriminated unions, Zod schemas)
- API routes (/api/plan, /api/events, /api/sessions)
- Component architecture with shadcn/ui
- Phase implementation status (PHASE1.md, PHASE2.md)

I'll analyze the area thoroughly by exploring relevant components, types, and their connections.
```

Then wait for the user's research query.

## Steps to follow after receiving the research query:

1. **Read any directly mentioned files first:**
   - If the user mentions specific files (tickets, docs, JSON), read them FULLY first
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks
   - This ensures you have full context before decomposing the research

2. **Analyze and decompose the research question:**
   - Break down the user's query into composable research areas specific to this codebase:
     * **UI Layer**: FormRenderer, Field components, OnboardingFlow orchestration
     * **Type System**: Discriminated unions (FormPlan, Field, UXEvent), Zod schemas
     * **Business Logic**: Rules Engine, LLM Director, Decision Cascade
     * **State Management**: Session Store, in-memory persistence, telemetry events
     * **API Layer**: Plan endpoint, events collection, streaming responses
     * **Configuration**: Field IDs whitelist, persona detection, timeout strategies
   - Check implementation status against PHASE1.md and PHASE2.md tracking
   - Create a research plan using TodoWrite to track all subtasks
   - Consider the three-tier decision architecture: deterministic rules → AI decisions → fallbacks

3. **Spawn parallel sub-agent tasks for comprehensive research:**
   - Create multiple Task agents to research different aspects concurrently

   **Project-specific agent tasks for this codebase:**

   **Type System Research:**
   - "Find all discriminated union types (FormPlan, Field, UXEvent) in lib/types/"
   - "Analyze Zod schema usage for runtime validation"
   - "Trace type flow from API to UI components"

   **Component Architecture:**
   - "Find FormRenderer and Field component implementations"
   - "Analyze shadcn/ui component integration patterns"
   - "Research OnboardingFlow orchestration and state management"

   **Decision Architecture:**
   - "Analyze Rules Engine in lib/policy/rules.ts for deterministic flows"
   - "Research LLM Director in lib/policy/llm.ts with timeout strategies"
   - "Find fallback patterns when AI decisions fail"

   **API & Streaming:**
   - "Research /api/plan endpoint for UI step decisions"
   - "Analyze /api/events telemetry collection patterns"
   - "Find AI SDK 5 streaming response implementations"

   **Session & State:**
   - "Analyze Session Store implementation and memory management"
   - "Research telemetry event batching and circular buffers"
   - "Find session cleanup and persistence strategies"

   **Phase Tracking:**
   - "Check completed tasks in PHASE1.md (P1-001 through P1-003)"
   - "Identify pending implementation items"
   - "Cross-reference with actual code implementation"

4. **Wait for all sub-agents to complete and synthesize findings:**
   - IMPORTANT: Wait for ALL sub-agent tasks to complete before proceeding
   - Compile all sub-agent results focusing on:
     * **Decision Flow**: How Rules → LLM → Fallback cascade works
     * **Type Safety**: How discriminated unions ensure compile-time safety
     * **Component Hierarchy**: FormRenderer → Field → specific inputs
     * **Performance**: Response time targets (Rules <100ms, LLM <2s)
     * **State Flow**: Session creation → event tracking → cleanup
   - Cross-reference with phase documentation:
     * Check PHASE1.md for MVP implementation status
     * Review PHASE2.md for AI enhancement plans
     * Note IMP.md for immediate priorities
   - Include specific patterns:
     * Polymorphic field rendering based on `kind` discriminator
     * Persona detection (explorer vs team) for UI adaptation
     * Event batching with 50-event circular buffer
     * 2-second timeout with fallback to deterministic rules
   - Answer with concrete file references (e.g., `lib/types/form.ts:45`)

5. **Gather metadata for the research document:**
   - generate all relevant metadata
   - Filename: `thoughts/shared/research/YYYY-MM-DD-ENG-XXXX-description.md`
     - Format: `YYYY-MM-DD-ENG-XXXX-description.md` where:
       - YYYY-MM-DD is today's date
       - ENG-XXXX is the ticket number (omit if no ticket)
       - description is a brief kebab-case description of the research topic
     - Examples:
       - With ticket: `2025-01-08-ENG-1478-parent-child-tracking.md`
       - Without ticket: `2025-01-08-authentication-flow.md`

6. **Generate research document:**
   - Use the metadata gathered in step 4
   - Structure the document with YAML frontmatter followed by content:
     ```markdown
     ---
     date: [Current date and time with timezone in ISO format]
     researcher: [Researcher name]
     git_commit: [Current commit hash]
     branch: [Current branch name]
     repository: gen_ui
     topic: "[User's Question/Topic]"
     tags: [research, generative-ui, decision-cascade, form-rendering, relevant-components]
     phase_context: [PHASE1/PHASE2 - current implementation phase]
     architecture_layer: [ui/types/business-logic/api/state]
     status: complete
     last_updated: [Current date in YYYY-MM-DD format]
     last_updated_by: [Researcher name]
     ---

     # Research: [User's Question/Topic]

     **Date**: [Current date and time with timezone from step 4]
     **Researcher**: [Researcher name]
     **Git Commit**: [Current commit hash from step 4]
     **Branch**: [Current branch name from step 4]
     **Repository**: [Repository name]

     ## Research Question
     [Original user query]

     ## Summary
     [High-level findings answering the user's question]

     ## Architecture Context
     - **Decision Model**: [Rules/LLM/Fallback cascade findings]
     - **Implementation Phase**: [Current phase from PHASE1.md/PHASE2.md]
     - **Core Pattern**: [Key architectural pattern discovered]

     ## Detailed Findings

     ### [Component/Area 1]
     - Finding with reference ([file.ext:line](link))
     - Connection to other components
     - Implementation details

     ### [Component/Area 2]
     ...

     ## Code References
     - `path/to/file.py:123` - Description of what's there
     - `another/file.ts:45-67` - Description of the code block

     ## Architecture Insights

     ### Decision Cascade
     [How Rules → LLM → Fallback pattern is implemented]

     ### Type Safety Strategy
     [Discriminated unions, Zod validation, type guards]

     ### Performance Optimizations
     [Response time targets, timeout strategies, caching]

     ### UI Adaptation Patterns
     [Persona detection, field reduction, dynamic forms]

     ## Historical Context (from thoughts/)
     [Relevant insights from thoughts/ directory with references]
     - `thoughts/shared/something.md` - Historical decision about X
     - `thoughts/local/notes.md` - Past exploration of Y
     Note: Paths exclude "searchable/" even if found there

     ## Related Research
     [Links to other research documents in thoughts/shared/research/]

     ## Open Questions
     [Any areas that need further investigation]
     ```

7. **Add GitHub permalinks (if applicable):**
   - Check if on main branch or if commit is pushed: `git branch --show-current` and `git status`
   - If on main/master or pushed, generate GitHub permalinks:
     - Get repo info: `gh repo view --json owner,name`
     - Create permalinks: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
   - Replace local file references with permalinks in the document

8. **Sync and present findings:**
   - Present a concise summary of findings to the user
   - Include key file references for easy navigation
   - Ask if they have follow-up questions or need clarification

9. **Handle follow-up questions:**
   - If the user has follow-up questions, append to the same research document
   - Update the frontmatter fields `last_updated` and `last_updated_by` to reflect the update
   - Add `last_updated_note: "Added follow-up research for [brief description]"` to frontmatter
   - Add a new section: `## Follow-up Research [timestamp]`
   - Spawn new sub-agents as needed for additional investigation
   - Continue updating the document and syncing

## Important notes:
- Always use parallel Task agents to maximize efficiency and minimize context usage
- Always run fresh codebase research - never rely solely on existing research documents
- The thoughts/ directory provides historical context to supplement live findings
- Focus on finding concrete file paths and line numbers for developer reference
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused on read-only operations
- Consider cross-component connections and architectural patterns
- Include temporal context (when the research was conducted)
- Link to GitHub when possible for permanent references
- Keep the main agent focused on synthesis, not deep file reading
- Encourage sub-agents to find examples and usage patterns, not just definitions
- Explore all of thoughts/ directory, not just research subdirectory

## Project-Specific Research Patterns:

### For UI Component Research:
- Trace from FormRenderer → Field → specific input components
- Check shadcn/ui integration and Radix UI primitives
- Analyze conditional rendering based on persona/state
- Review field validation and error handling patterns

### For Type System Research:
- Follow discriminated union patterns with `kind` field
- Check Zod schema definitions and runtime validation
- Trace type flow from API responses to UI props
- Identify type guards and narrowing functions

### For Decision Architecture Research:
- Map the three-tier cascade: Rules → LLM → Fallback
- Identify timeout boundaries and error handling
- Analyze persona detection logic (explorer vs team)
- Review field reduction strategies (~30% target)

### For API & Streaming Research:
- Analyze Next.js 15.4 App Router patterns
- Check AI SDK 5 streaming implementations
- Review session-based request handling
- Identify telemetry batching strategies

### For Performance Research:
- Check response time targets (Rules <100ms, LLM <2s)
- Analyze memory management (session cleanup, event buffers)
- Review optimization strategies (caching, batching)
- Identify bottlenecks and timeout strategies
- **File reading**: Always read mentioned files FULLY (no limit/offset) before spawning sub-tasks
- **Critical ordering**: Follow the numbered steps exactly
  - ALWAYS read mentioned files first before spawning sub-tasks (step 1)
  - ALWAYS wait for all sub-agents to complete before synthesizing (step 4)
  - ALWAYS gather metadata before writing the document (step 5 before step 6)
  - NEVER write the research document with placeholder values
- **Path handling**: The thoughts/searchable/ directory contains hard links for searching
  - Always document paths by removing ONLY "searchable/" - preserve all other subdirectories
  - Examples of correct transformations:
    - `thoughts/searchable/allison/old_stuff/notes.md` → `thoughts/allison/old_stuff/notes.md`
    - `thoughts/searchable/shared/prs/123.md` → `thoughts/shared/prs/123.md`
    - `thoughts/searchable/global/shared/templates.md` → `thoughts/global/shared/templates.md`
  - NEVER change allison/ to shared/ or vice versa - preserve the exact directory structure
  - This ensures paths are correct for editing and navigation
- **Frontmatter consistency**:
  - Always include frontmatter at the beginning of research documents
  - Keep frontmatter fields consistent across all research documents
  - Update frontmatter when adding follow-up research
  - Use snake_case for multi-word field names (e.g., `last_updated`, `git_commit`)
  - Tags should be relevant to the research topic and components studied
  - Include `phase_context` to track PHASE1/PHASE2 implementation status
  - Include `architecture_layer` to categorize research area

## Example Research Queries for This Codebase:

1. "How does the Decision Cascade determine which UI components to show?"
2. "What's the session management strategy and how are events tracked?"
3. "How are discriminated unions used for type safety in form rendering?"
4. "What's the LLM integration pattern with AI SDK 5?"
5. "How does the Rules Engine implement persona-based field reduction?"
6. "What's the telemetry collection and batching strategy?"
7. "How is the FormRenderer component architected with shadcn/ui?"
8. "What's the implementation status of PHASE1 tasks?"
