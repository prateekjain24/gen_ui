import { FIELD_IDS } from "@/lib/constants/fields";
import type { Field, FieldOption } from "@/lib/types/form";

export type CanvasRecipeId = "R1" | "R2" | "R3" | "R4";
export type CanvasPersona = "explorer" | "team" | "client" | "power";

export interface CanvasRecipeMetadata {
  recommendedCta?: string;
}

export interface CanvasRecipe {
  /** Persona hint that downstream UI can use for styling/messaging. */
  persona: CanvasPersona;
  /** Default reasoning snippet explaining why the recipe was chosen. */
  reasoning: string;
  /** Fields rendered by the canvas assembler for this recipe. */
  fields: Field[];
  /** Optional metadata for future UI nudges (e.g. CTA labels). */
  metadata?: CanvasRecipeMetadata;
}

export const defaultRecipeId: CanvasRecipeId = "R1";

const soloNextSteps: FieldOption[] = [
  { value: "sketch", label: "Capture a few starter notes" },
  { value: "structure", label: "Add sections for planning later" },
  { value: "share", label: "Share when you're ready" },
];

const teamSizeOptions: FieldOption[] = [
  { value: "1", label: "Just me" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-20", label: "6-20 people" },
  { value: "21-50", label: "21-50 people" },
  { value: "51-100", label: "51-100 people" },
  { value: "101-500", label: "101-500 people" },
  { value: "500+", label: "More than 500" },
];

const teamIntegrationOptions: FieldOption[] = [
  { value: "slack", label: "Slack" },
  { value: "jira", label: "Jira" },
  { value: "notion", label: "Notion" },
  { value: "asana", label: "Asana" },
];

const clientProjectOptions: FieldOption[] = [
  { value: "client", label: "Client delivery" },
  { value: "internal", label: "Internal project" },
  { value: "retainer", label: "Retainer support" },
];

const clientIntegrationOptions: FieldOption[] = [
  { value: "gdrive", label: "Google Drive" },
  { value: "slack", label: "Slack" },
  { value: "asana", label: "Asana" },
  { value: "figma", label: "Figma" },
];

const governanceIntegrationOptions: FieldOption[] = [
  { value: "okta", label: "Okta" },
  { value: "jira", label: "Jira" },
  { value: "onelogin", label: "OneLogin" },
  { value: "servicenow", label: "ServiceNow" },
];

const accessLevelOptions: FieldOption[] = [
  { value: "restricted", label: "Restricted (least privilege)" },
  { value: "standard", label: "Standard collaborators" },
  { value: "broad", label: "Broad access" },
];

/**
 * Explorer quick start that keeps friction low for solo users.
 */
const R1_RECIPE: CanvasRecipe = {
  persona: "explorer",
  reasoning: "Recommended a lightweight start so you can add details later.",
  fields: [
    {
      kind: "callout",
      id: FIELD_IDS.GUIDED_CALLOUT,
      label: "Explorer intro",
      variant: "info",
      body: "We'll start simple. You can add more later.",
      icon: "sparkles",
    },
    {
      kind: "text",
      id: FIELD_IDS.WORKSPACE_NAME,
      label: "Workspace name",
      placeholder: "Name this workspace (optional)",
      helperText: "Skip if you're just exploring.",
    },
    {
      kind: "ai_hint",
      id: FIELD_IDS.AI_HINT,
      label: "Need inspiration?",
      body: "Keep it broad for now—you can rename once the plan comes together.",
      targetFieldId: FIELD_IDS.WORKSPACE_NAME,
    },
    {
      kind: "checklist",
      id: FIELD_IDS.GUIDED_CHECKLIST,
      label: "What's next",
      items: [
        { id: "start-notes", label: soloNextSteps[0].label },
        { id: "add-structure", label: soloNextSteps[1].label },
        { id: "share-later", label: soloNextSteps[2].label },
      ],
    },
  ],
  metadata: {
    recommendedCta: "Continue",
  },
};

/**
 * Team workspace recipe prioritising invites and integrations for collaboration.
 */
const R2_RECIPE: CanvasRecipe = {
  persona: "team",
  reasoning: "Mentioned a multi-person workspace with Slack and Jira integrations.",
  fields: [
    {
      kind: "info_badge",
      id: FIELD_IDS.PERSONA_INFO_BADGE,
      label: "Team workspace with invites and integrations.",
      variant: "info",
      icon: "users",
    },
    {
      kind: "text",
      id: FIELD_IDS.WORKSPACE_NAME,
      label: "Workspace name",
      placeholder: "E.g. Product launch hub",
      required: true,
    },
    {
      kind: "select",
      id: FIELD_IDS.TEAM_SIZE,
      label: "Team size",
      options: teamSizeOptions,
      value: "6-20",
      required: true,
    },
    {
      kind: "integration_picker",
      id: FIELD_IDS.PREFERRED_INTEGRATIONS,
      label: "Connect integrations",
      helperText: "Recommended based on your prompt.",
      options: teamIntegrationOptions,
      values: ["slack", "jira"],
      maxSelections: 3,
    },
    {
      kind: "teammate_invite",
      id: FIELD_IDS.TEAM_INVITES,
      label: "Invite teammates",
      helperText: "Share with collaborators now or add later.",
      placeholder: "teammate@example.com",
      maxInvites: 5,
    },
    {
      kind: "admin_toggle",
      id: FIELD_IDS.ADMIN_CONTROLS,
      label: "Approvals",
      options: [
        { value: "disabled", label: "Disabled", helperText: "Changes go live instantly." },
        { value: "required", label: "Require approvals", helperText: "Managers review updates before publishing." },
      ],
      value: "required",
    },
  ],
  metadata: {
    recommendedCta: "Start setup",
  },
};

/**
 * Client project recipe focused on sharing safely with external stakeholders.
 */
const R3_RECIPE: CanvasRecipe = {
  persona: "client",
  reasoning: "Flagged a client project—surfacing sharing guardrails and kickoff tasks.",
  fields: [
    {
      kind: "text",
      id: FIELD_IDS.WORKSPACE_NAME,
      label: "Client project name",
      placeholder: "E.g. ACME rollout plan",
      required: true,
    },
    {
      kind: "select",
      id: FIELD_IDS.PROJECT_TYPE,
      label: "Project focus",
      options: clientProjectOptions,
      value: "client",
      required: true,
    },
    {
      kind: "integration_picker",
      id: FIELD_IDS.PREFERRED_INTEGRATIONS,
      label: "Partner tools",
      helperText: "Connect workspaces your client already uses.",
      options: clientIntegrationOptions,
      values: ["gdrive", "slack"],
      maxSelections: 3,
    },
    {
      kind: "ai_hint",
      id: FIELD_IDS.AI_HINT,
      label: "Sharing tip",
      body: "Keep sensitive folders in Google Drive and link to them here for quick access.",
      targetFieldId: FIELD_IDS.PREFERRED_INTEGRATIONS,
    },
    {
      kind: "checklist",
      id: FIELD_IDS.GUIDED_CHECKLIST,
      label: "Kickoff checklist",
      items: [
        { id: "kickoff", label: "Schedule the kickoff call" },
        { id: "files", label: "Organize shared files" },
        { id: "access", label: "Confirm client access rules" },
      ],
    },
  ],
  metadata: {
    recommendedCta: "Review plan",
  },
};

/**
 * Power/compliance recipe emphasising governance controls and secure integrations.
 */
const R4_RECIPE: CanvasRecipe = {
  persona: "power",
  reasoning: "Highlighted approvals and audit needs—enabling governance controls by default.",
  fields: [
    {
      kind: "text",
      id: FIELD_IDS.WORKSPACE_NAME,
      label: "Workspace name",
      placeholder: "E.g. Compliance control center",
      required: true,
    },
    {
      kind: "admin_toggle",
      id: FIELD_IDS.ADMIN_CONTROLS,
      label: "Change approvals",
      options: [
        { value: "disabled", label: "Disabled" },
        { value: "required", label: "Require approvals", helperText: "Admins must approve major updates." },
      ],
      value: "required",
    },
    {
      kind: "checkbox",
      id: FIELD_IDS.AUDIT_LOGGING,
      label: "Audit logging",
      options: [
        { value: "enabled", label: "Capture admin actions" },
      ],
      values: ["enabled"],
      helperText: "Recommended for regulated teams.",
    },
    {
      kind: "select",
      id: FIELD_IDS.ACCESS_LEVEL,
      label: "Default access level",
      options: accessLevelOptions,
      value: "restricted",
      required: true,
    },
    {
      kind: "integration_picker",
      id: FIELD_IDS.PREFERRED_INTEGRATIONS,
      label: "Security integrations",
      helperText: "Connect identity and ticketing systems.",
      options: governanceIntegrationOptions,
      values: ["okta", "jira"],
      maxSelections: 3,
    },
  ],
  metadata: {
    recommendedCta: "Enable controls",
  },
};

export const RECIPES: Record<CanvasRecipeId, CanvasRecipe> = {
  R1: R1_RECIPE,
  R2: R2_RECIPE,
  R3: R3_RECIPE,
  R4: R4_RECIPE,
};

export const getRecipe = (id: CanvasRecipeId): CanvasRecipe => RECIPES[id];
