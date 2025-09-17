# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Generative UI POC that demonstrates AI-orchestrated adaptive onboarding flows. The system uses LLMs to dynamically determine which UI components to show based on user context and behavior patterns.

## Setup & Development Commands

### Initial Project Setup (if not already done)
```bash
# Create Next.js project with TypeScript and Tailwind
bunx create-next-app@latest . --typescript --tailwind --app

# Install core dependencies
bun add @vercel/ai@latest openai@latest zod uuid
bun add @radix-ui/react-label @radix-ui/react-select
bun add @radix-ui/react-checkbox @radix-ui/react-radio-group
bun add lucide-react class-variance-authority clsx tailwind-merge

# Initialize shadcn/ui (choose: New York style, Neutral base color, CSS variables)
bunx shadcn@latest init

# Install dev dependencies
bun add -D @types/uuid prettier eslint-config-prettier
```

### Development Commands
```bash
# Run development server
bun dev

# Build for production
bun build

# Start production server
bun start

# Run type checking
bunx tsc --noEmit

# Run linting
bunx eslint . --ext .ts,.tsx

# Format code
bunx prettier --write .
```

### Testing Flows
```bash
# Test adaptive (AI-powered) flow
open http://localhost:3000/onboarding?variant=adaptive

# Test static (rules-based) flow
open http://localhost:3000/onboarding?variant=static

# View metrics dashboard
open http://localhost:3000/metrics
```

## Architecture & Key Patterns

### Core Architecture: Decision Cascade
The system uses a three-tier decision cascade for determining UI flow:

1. **Rules Engine** (`lib/policy/rules.ts`) - Fast, deterministic rules (< 100ms)
2. **LLM Director** (`lib/policy/llm.ts`) - AI-powered decisions with 2s timeout
3. **Fallback Rules** - Basic flow when LLM fails or times out

### Key Components

- **FormRenderer** (`components/form/FormRenderer.tsx`) - Renders dynamic form steps
- **Field Component** (`components/form/Field.tsx`) - Polymorphic field renderer
- **OnboardingFlow** (`components/onboarding/OnboardingFlow.tsx`) - Main orchestrator
- **Session Store** (`lib/store/session.ts`) - In-memory session management

### Type System
The project uses discriminated unions for type safety:
- `FormPlan` - Represents different UI states (render_step, review, success, error)
- `Field` - Union of TextField, RadioField, CheckboxField, SelectField
- `UXEvent` - Telemetry events for tracking user behavior

### API Routes
- `/api/plan` - Returns next UI step based on session state
- `/api/events` - Collects telemetry for analysis
- `/api/sessions` - Session management endpoints

## Implementation Priorities

When implementing features, follow this priority order:
1. Core types and session management
2. Rules engine for deterministic flows
3. Basic UI components with shadcn/ui
4. LLM integration with proper error handling
5. Telemetry and metrics collection

## AI Integration Guidelines

### Using AI SDK 5 (Preferred over direct OpenAI)
```typescript
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';

// Use structured output with Zod schemas
const result = await generateObject({
  model: openai('gpt-4-turbo'),
  schema: stepConfigSchema,
  prompt: userPrompt,
});
```

### LLM Decision Parameters
- Model: `gpt-4-turbo` for consistency
- Temperature: 0.3 (low for predictable outputs)
- Timeout: 2000ms (fallback to rules if exceeded)
- Max tokens: 1000 (sufficient for form configs)

## Testing Strategy

### Critical Test Scenarios
1. Complete flow with minimal info (explorer persona)
2. Complete flow with all fields (team persona)
3. LLM timeout handling (disconnect internet)
4. Back navigation at each step
5. Session persistence across refreshes
6. Field validation and error states

### Monitoring Decision Sources
Check console for decision sources: `[Plan Source: rules|llm|fallback]`

## Performance Targets
- Rules engine: < 100ms response time
- LLM decisions: < 2s (with timeout fallback)
- Completion rate: > 70% for adaptive flow
- Field reduction: ~30% fewer fields with AI optimization

## Common Pitfalls to Avoid
- Don't call LLM for every field change (use batching)
- Validate all field IDs against whitelist for security
- Always provide fallback for LLM failures
- Keep sessions in memory for POC (use Redis for production)
- Track events asynchronously to avoid UI blocking

## Next Steps After POC
1. Add Redis for persistent session storage
2. Implement A/B testing framework
3. Add more sophisticated LLM prompt engineering
4. Build analytics dashboard with real metrics
5. Add multi-step undo/redo functionality

## Available Claude Code Agents

### Task Agents
Claude Code provides specialized agents that can be invoked for specific tasks:

1. **general-purpose**: General research and multi-step task execution
   - Use for: Complex searches, code exploration, multi-step workflows
   - Best when: You need thorough investigation across multiple files

2. **frontend-architect**: React/Next.js development specialist
   - Use for: Creating UI components, especially with shadcn/ui
   - Expertise: Component architecture, performance optimization, clean code patterns
   - Follows patterns from: Linear, Airbnb, and other leading tech companies

3. **engineering-manager-ai**: Strategic technical guidance
   - Use for: Architecture decisions, Next.js 15.4 implementation, AI SDK 5 integration
   - Focus: Production-ready solutions with industry best practices
   - Special expertise: LLM integrations, streaming responses, RAG systems

4. **prompt-engineer-structured**: Prompt creation for structured outputs
   - Use for: Designing prompts that produce parseable, production-ready outputs
   - Ideal for: API integrations, data extraction, automated workflows

5. **statusline-setup**: Claude Code status line configuration
   - Use for: Customizing Claude Code's status line display

6. **output-style-setup**: Claude Code output style customization
   - Use for: Creating custom output styles for Claude Code

## Available MCP (Model Context Protocol) Servers

### Component & Documentation Servers

1. **shadcn-ui**: Direct access to shadcn/ui v4 components
   - Functions: Get components, demos, blocks, metadata
   - Resource: List of available components
   - Use for: Quick component integration without manual copying

2. **Context7**: Library documentation retrieval
   - Functions: Resolve library IDs, fetch up-to-date docs
   - Use for: Getting current documentation for any library
   - Process: First resolve library ID, then fetch docs

### AI & API Servers

3. **Replicate**: ML model deployment API
   - Functions: List endpoints, get schemas, invoke endpoints
   - Use for: Running ML models in production

4. **pm_content_n8n_mcp**: Perplexity search integration
   - Function: Web search using Perplexity
   - Use for: Current information beyond knowledge cutoff

5. **sequential-thinking**: Structured problem-solving
   - Function: Step-by-step thinking for complex problems
   - Use for: Breaking down complex tasks, planning, analysis

## Usage Examples

### Using Agents for Complex Tasks
```typescript
// When to use frontend-architect agent:
// - Creating new React components with shadcn/ui
// - Refactoring UI code for better patterns
// - Performance optimization of React components

// When to use engineering-manager-ai agent:
// - Architecting AI-powered features
// - Next.js 15.4 app router implementation
// - Streaming response patterns with AI SDK 5
```

### Leveraging MCP Servers
```typescript
// Using shadcn-ui MCP for component integration:
// 1. List available components
// 2. Get component source code
// 3. Get demo implementation
// 4. Integrate with project's existing patterns

// Using Context7 for documentation:
// 1. Resolve library name to Context7 ID
// 2. Fetch relevant documentation with token limit
// 3. Apply to current implementation
```

### Best Practices
- Use specialized agents for their domain expertise rather than general-purpose
- Leverage MCP servers for real-time component/doc access instead of web search
- Chain agents for complex workflows (research → implementation → review)
- Use sequential-thinking MCP for planning before diving into implementation