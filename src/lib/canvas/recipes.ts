import { FIELD_IDS } from "@/lib/constants/fields";
import type { Field, FieldOption } from "@/lib/types/form";

/**
 * Recipes define the default canvas experience for each persona.
 * Phase 4 introduces "knobs" that expose tunable parameters alongside the prebuilt fields
 * so product and design can adjust approval depth, integrations, tone, invitations, and cadence
 * without modifying component code.
 */

export type CanvasRecipeId = "R1" | "R2" | "R3" | "R4";
export type CanvasPersona = "explorer" | "team" | "client" | "power";

export type RecipeKnobId =
  | "approvalChainLength"
  | "integrationMode"
  | "copyTone"
  | "inviteStrategy"
  | "notificationCadence";

export type RecipeKnobType = "number" | "enum";

export interface RecipeEnumOption {
  /** Display label for UI surfaces that render this knob option. */
  label: string;
  /** Serialized value stored when the knob is applied. */
  value: string;
  /** Optional short description clarifying how the option adjusts the recipe. */
  description?: string;
}

interface BaseRecipeKnobDefinition<TValue> {
  /** Stable identifier used by personalization scoring and UI surfaces. */
  id: RecipeKnobId;
  /** Human readable label shown in customization controls. */
  label: string;
  /** Text that explains the impact of changing the knob on the rendered experience. */
  description: string;
  /** Default value that preserves the Phase 3 experience when no adjustments are made. */
  defaultValue: TValue;
}

export interface RecipeNumberKnobDefinition extends BaseRecipeKnobDefinition<number> {
  type: "number";
  /** Minimum supported value for guardrailing personalization adjustments. */
  min?: number;
  /** Maximum supported value for guardrailing personalization adjustments. */
  max?: number;
  /** Step size to snap slider controls to supported values. */
  step?: number;
}

export interface RecipeEnumKnobDefinition extends BaseRecipeKnobDefinition<string> {
  type: "enum";
  /** Allowed option set surfaced to end users. */
  options: RecipeEnumOption[];
}

export type RecipeKnobDefinition = RecipeNumberKnobDefinition | RecipeEnumKnobDefinition;

export type RecipeKnobMap = Partial<Record<RecipeKnobId, RecipeKnobDefinition>>;

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
  /** Parameter knobs that personalization can adjust per recipe. */
  knobs: RecipeKnobMap;
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

const integrationModeKnobOptions: RecipeEnumOption[] = [
  {
    value: "lightweight",
    label: "Lightweight",
    description: "Keeps integrations optional and hidden until the user opts in.",
  },
  {
    value: "multi_tool",
    label: "Multi-tool workspace",
    description: "Surfaces Slack, Jira, and other collaboration integrations by default.",
  },
  {
    value: "client_portal",
    label: "Client portal",
    description: "Highlights shared folders and external collaboration links up front.",
  },
  {
    value: "governed",
    label: "Governed",
    description: "Locks integrations to vetted systems and flags compliance controls first.",
  },
];

const copyToneKnobOptions: RecipeEnumOption[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Keeps helper text casual and encouraging for exploratory users.",
  },
  {
    value: "collaborative",
    label: "Collaborative",
    description: "Focuses copy on teamwork, shared ownership, and next actions.",
  },
  {
    value: "client_ready",
    label: "Client-ready",
    description: "Uses polished, reassuring language aimed at external stakeholders.",
  },
  {
    value: "compliance",
    label: "Compliance",
    description: "Leans formal with governance cues and risk reminders.",
  },
];

const inviteStrategyKnobOptions: RecipeEnumOption[] = [
  {
    value: "self_serve",
    label: "Self-serve",
    description: "Defers invites so solo users can explore before sharing.",
  },
  {
    value: "immediate",
    label: "Immediate",
    description: "Encourages adding teammates during the initial canvas setup.",
  },
  {
    value: "stakeholder_first",
    label: "Stakeholder first",
    description: "Prioritises inviting client stakeholders after the plan is drafted.",
  },
  {
    value: "staged",
    label: "Staged",
    description: "Rolls invites out after approvals to keep governance in control.",
  },
];

const notificationCadenceKnobOptions: RecipeEnumOption[] = [
  {
    value: "none",
    label: "No notifications",
    description: "Suppresses automated reminders for a distraction-free setup.",
  },
  {
    value: "weekly",
    label: "Weekly digest",
    description: "Sends a weekly summary with outstanding tasks and decisions.",
  },
  {
    value: "daily",
    label: "Daily summary",
    description: "Keeps the team aligned with day-by-day progress nudges.",
  },
  {
    value: "real_time",
    label: "Real-time alerts",
    description: "Notifies stakeholders immediately when key fields change.",
  },
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
  knobs: {
    /** Explorer plans publish instantly so the approval chain stays disabled. */
    approvalChainLength: {
      id: "approvalChainLength",
      label: "Approval chain length",
      description: "Number of approvers required before publishing workspace updates.",
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 5,
      step: 1,
    },
    /** Minimal setup keeps integrations optional unless the user opts in. */
    integrationMode: {
      id: "integrationMode",
      label: "Integration mode",
      description: "Controls how prominently we surface integrations during setup.",
      type: "enum",
      defaultValue: "lightweight",
      options: integrationModeKnobOptions,
    },
    /** Copy stays upbeat and low pressure for exploratory flows. */
    copyTone: {
      id: "copyTone",
      label: "Copy tone",
      description: "Sets the voice used in callouts, helper text, and CTAs.",
      type: "enum",
      defaultValue: "friendly",
      options: copyToneKnobOptions,
    },
    /** Invites remain optional so explorers can solo the workspace first. */
    inviteStrategy: {
      id: "inviteStrategy",
      label: "Invite strategy",
      description: "Determines when we suggest inviting collaborators.",
      type: "enum",
      defaultValue: "self_serve",
      options: inviteStrategyKnobOptions,
    },
    /** No scheduled nudges keeps distraction low while exploring. */
    notificationCadence: {
      id: "notificationCadence",
      label: "Notification cadence",
      description: "Sets the frequency of reminder emails and in-app nudges.",
      type: "enum",
      defaultValue: "none",
      options: notificationCadenceKnobOptions,
    },
  },
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
  knobs: {
    /** Teams expect at least one approver to review changes before going live. */
    approvalChainLength: {
      id: "approvalChainLength",
      label: "Approval chain length",
      description: "Sets how many managers must approve workspace changes.",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 1,
    },
    /** Team flows emphasise multi-tool integrations like Slack and Jira. */
    integrationMode: {
      id: "integrationMode",
      label: "Integration mode",
      description: "Controls which integrations we recommend during setup.",
      type: "enum",
      defaultValue: "multi_tool",
      options: integrationModeKnobOptions,
    },
    /** Copy highlights collaborative nudges and shared responsibility. */
    copyTone: {
      id: "copyTone",
      label: "Copy tone",
      description: "Tunes helper text to emphasise collaboration or compliance.",
      type: "enum",
      defaultValue: "collaborative",
      options: copyToneKnobOptions,
    },
    /** Encourage immediate invites so the core team joins during setup. */
    inviteStrategy: {
      id: "inviteStrategy",
      label: "Invite strategy",
      description: "Determines when we prompt users to add collaborators.",
      type: "enum",
      defaultValue: "immediate",
      options: inviteStrategyKnobOptions,
    },
    /** Daily nudges keep active teams focused on outstanding tasks. */
    notificationCadence: {
      id: "notificationCadence",
      label: "Notification cadence",
      description: "Controls how frequently we send reminders and task summaries.",
      type: "enum",
      defaultValue: "daily",
      options: notificationCadenceKnobOptions,
    },
  },
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
  knobs: {
    /** Client projects usually publish quickly and rely on manual reviews. */
    approvalChainLength: {
      id: "approvalChainLength",
      label: "Approval chain length",
      description: "Dictates how many internal reviewers must approve before clients see changes.",
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 5,
      step: 1,
    },
    /** Client-first flows emphasise shared docs and external integrations. */
    integrationMode: {
      id: "integrationMode",
      label: "Integration mode",
      description: "Adjusts which partner tools we prioritise for client collaboration.",
      type: "enum",
      defaultValue: "client_portal",
      options: integrationModeKnobOptions,
    },
    /** Tone stays polished to instil confidence with external stakeholders. */
    copyTone: {
      id: "copyTone",
      label: "Copy tone",
      description: "Controls how formal or casual the helper text reads for clients.",
      type: "enum",
      defaultValue: "client_ready",
      options: copyToneKnobOptions,
    },
    /** Focus on inviting external stakeholders after kickoff deliverables are ready. */
    inviteStrategy: {
      id: "inviteStrategy",
      label: "Invite strategy",
      description: "Decides when to prompt inviting clients versus internal teammates.",
      type: "enum",
      defaultValue: "stakeholder_first",
      options: inviteStrategyKnobOptions,
    },
    /** Weekly summaries keep clients informed without overwhelming them. */
    notificationCadence: {
      id: "notificationCadence",
      label: "Notification cadence",
      description: "Chooses how often clients and leads receive project updates.",
      type: "enum",
      defaultValue: "weekly",
      options: notificationCadenceKnobOptions,
    },
  },
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
  knobs: {
    /** Governance flows default to multi-step approvals before changes publish. */
    approvalChainLength: {
      id: "approvalChainLength",
      label: "Approval chain length",
      description: "Sets the depth of the approval ladder required for compliance teams.",
      type: "number",
      defaultValue: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    /** Enterprise setups restrict integrations to vetted systems by default. */
    integrationMode: {
      id: "integrationMode",
      label: "Integration mode",
      description: "Controls whether we surface only pre-approved governance integrations.",
      type: "enum",
      defaultValue: "governed",
      options: integrationModeKnobOptions,
    },
    /** Tone is formal to reinforce compliance obligations and audit readiness. */
    copyTone: {
      id: "copyTone",
      label: "Copy tone",
      description: "Determines how strict or formal the compliance messaging sounds.",
      type: "enum",
      defaultValue: "compliance",
      options: copyToneKnobOptions,
    },
    /** Invites roll out after controls are configured to avoid premature access. */
    inviteStrategy: {
      id: "inviteStrategy",
      label: "Invite strategy",
      description: "Specifies when governance teams invite broader collaborators.",
      type: "enum",
      defaultValue: "staged",
      options: inviteStrategyKnobOptions,
    },
    /** Real-time alerts capture the high-scrutiny workflows compliance teams expect. */
    notificationCadence: {
      id: "notificationCadence",
      label: "Notification cadence",
      description: "Sets how urgently we notify approvers about canvas changes.",
      type: "enum",
      defaultValue: "real_time",
      options: notificationCadenceKnobOptions,
    },
  },
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
