export interface CanvasChip {
  label: string;
  prompt: string;
}

export interface CanvasCopy {
  placeholder: string;
  helperText: string;
  chips: readonly CanvasChip[];
}

export const canvasCopy: CanvasCopy = {
  placeholder: "What do you want to get done today?",
  helperText: "Describe the onboarding or workspace you need—we'll assemble a tailored flow in seconds.",
  chips: [
    {
      label: "Plan a workspace for my team of 10 with Slack + Jira.",
      prompt: "Plan a workspace for my team of 10 with Slack + Jira.",
    },
    {
      label: "Personal creative hub I can tweak later.",
      prompt: "Personal creative hub I can tweak later.",
    },
    {
      label: "Client project with approvals and audit logs.",
      prompt: "Client project with approvals and audit logs.",
    },
  ] as const,
};
