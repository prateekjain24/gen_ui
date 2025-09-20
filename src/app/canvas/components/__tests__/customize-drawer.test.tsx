/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import { CustomizeDrawer } from "../customize-drawer";

import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";

const baseKnobs: RecipeKnobOverrides = {
  approvalChainLength: { value: 1, rationale: "default", changedFromDefault: false },
  integrationMode: { value: "multi_tool", rationale: "default", changedFromDefault: false },
  copyTone: { value: "collaborative", rationale: "default", changedFromDefault: false },
  inviteStrategy: { value: "immediate", rationale: "default", changedFromDefault: false },
  notificationCadence: { value: "daily", rationale: "default", changedFromDefault: false },
};

const baseSignals: PromptSignals = {
  teamSizeBracket: { value: "10-24", metadata: { source: "merge", confidence: 0.6 } },
  decisionMakers: { value: [], metadata: { source: "merge", confidence: 0.2 } },
  approvalChainDepth: { value: "unknown", metadata: { source: "merge", confidence: 0.2 } },
  tools: { value: ["Slack", "Jira"], metadata: { source: "keyword", confidence: 0.9 } },
  integrationCriticality: { value: "must-have", metadata: { source: "llm", confidence: 0.7 } },
  complianceTags: { value: [], metadata: { source: "merge", confidence: 0.1 } },
  copyTone: { value: "fast-paced", metadata: { source: "keyword", confidence: 0.8 } },
  industry: { value: "saas", metadata: { source: "llm", confidence: 0.6 } },
  primaryObjective: { value: "scale", metadata: { source: "llm", confidence: 0.6 } },
  constraints: { value: {}, metadata: { source: "merge", confidence: 0.1 } },
  operatingRegion: { value: "na", metadata: { source: "llm", confidence: 0.5 } },
};

const previewCopy = {
  stepTitle: "Team workspace essentials",
  helperText: "Bring collaborators, integrations, and structure together.",
  primaryCta: "Start setup",
  callout: {
    heading: "Invite collaborators",
    body: "Get the core team into the workspace immediately.",
  },
  badgeCaption: "Team workspace",
  issues: [],
};

describe("CustomizeDrawer history controls", () => {
  const onOpenChange = jest.fn();
  const fetchMock = jest.fn();
  let originalFetch: typeof fetch | undefined;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "",
      statusText: "ok",
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch ?? ((undefined as unknown) as typeof fetch);
  });

  const setup = () =>
    render(
      <CustomizeDrawer
        open
        onOpenChange={onOpenChange}
        recipeId="R1"
        promptSignals={baseSignals}
        knobOverrides={baseKnobs}
        previewCopy={previewCopy}
      />
    );

  it("restores previous knob state when undo is pressed", async () => {
    setup();

    const slider = screen.getByLabelText(/Approval chain length/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "3" } });
    expect(slider.value).toBe("3");

    const undoButton = screen.getByRole("button", { name: /undo/i });
    expect(undoButton).not.toBeDisabled();

    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(slider.value).toBe("1");
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Reverted last change/i);
    });
  });

  it("resets knobs to baseline and enables undo", async () => {
    setup();

    const slider = screen.getByLabelText(/Approval chain length/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "4" } });
    await waitFor(() => expect(slider.value).toBe("4"));

    const resetButton = screen.getByRole("button", { name: /Reset to baseline/i });
    fireEvent.click(resetButton);

    await waitFor(() => expect(slider.value).toBe("1"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Reset to baseline settings/i));

    const undoButton = screen.getByRole("button", { name: /undo/i });
    expect(undoButton).not.toBeDisabled();

    fireEvent.click(undoButton);
    await waitFor(() => expect(slider.value).toBe("4"));
  });
});
