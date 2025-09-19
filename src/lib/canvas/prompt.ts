import type { CanvasRecipeId } from "./recipes";

const CANVAS_SYSTEM_PROMPT = `You classify onboarding intents into one of four deterministic recipes.
Recipes:
- R1 Explorer Quick Start → Lightweight callout + optional workspace name + ai_hint + checklist. For solo or vague prompts.
- R2 Team Workspace → Workspace name, team size, integrations, teammate invites, admin toggle. For team/collaboration intents (Slack, Jira, invites, team size ≥ 3).
- R3 Client Project → Workspace name, project type client, integrations (GDrive/Slack/Asana), ai_hint for sharing, kickoff checklist. For client/agency/stakeholder language.
- R4 Power/Compliance → Workspace name, admin toggle, audit logging checkbox, access level select, security integrations (Okta/Jira). For governance/security/audit/policy needs.

Always respond with valid minified JSON:
{
  "persona": "explorer|team|power",
  "recipe_id": "R1|R2|R3|R4",
  "intent_tags": ["tag"],
  "confidence": number between 0 and 1,
  "reasoning": "≤120 chars explaining the match"
}

Rules:
- Use persona "power" only when approvals/audit/security/compliance are explicit.
- Use persona "team" for team/client collaboration including invites, stakeholders, agencies, etc.
- Use persona "explorer" as the safe default for solo or unclear prompts.
- Keep intent_tags lowercase snake_case (e.g., "integrations", "invites", "governance", "client", "solo"). Include at most 3 tags.
- If unsure, set confidence ≤ 0.5 and prefer R1.`;

export interface CanvasClassifierContext {
  domainEmail?: string;
  teamSize?: string;
  metadata?: Record<string, unknown>;
}

export interface BuildCanvasPromptArgs extends CanvasClassifierContext {
  message: string;
}

const sanitizeValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

export const CANVAS_CLASSIFIER_SYSTEM_PROMPT = CANVAS_SYSTEM_PROMPT;

export function buildCanvasClassifierPrompt({ message, domainEmail, teamSize, metadata }: BuildCanvasPromptArgs): string {
  const contextLines: string[] = [];

  if (domainEmail) {
    contextLines.push(`Domain email: ${sanitizeValue(domainEmail)}`);
  }

  if (teamSize) {
    contextLines.push(`Team size: ${sanitizeValue(teamSize)}`);
  }

  if (metadata && Object.keys(metadata).length > 0) {
    contextLines.push(`Metadata: ${sanitizeValue(metadata)}`);
  }

  const formattedMessage = message.trim();
  const contextBlock = contextLines.length > 0 ? `\nContext:\n- ${contextLines.join('\n- ')}` : '';

  return `Classify the following Canvas Chat request into a recipe.\n\nUser message:\n"""${formattedMessage}"""${contextBlock}\n\nReturn only the JSON object described in the system instructions.`;
}

export type CanvasClassifierRecipe = CanvasRecipeId;
