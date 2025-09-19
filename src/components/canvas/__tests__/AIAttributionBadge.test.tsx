/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { AIAttributionBadge } from "../AIAttributionBadge";

describe("AIAttributionBadge", () => {
  const attribution = {
    source: "ai" as const,
    summary: "Personalized using collaboration signals",
    rationale: "Raised tone to collaborative based on Slack references.",
    knob: {
      id: "copyTone",
      label: "Copy tone",
      value: "Collaborative",
      changed: true,
    },
    signals: [{ label: "Copy tone", value: "fast-paced", confidence: 0.82 }],
  };

  it("renders nothing when attribution is missing", () => {
    const { container } = render(<AIAttributionBadge attribution={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("displays source label and opens tooltip on click", () => {
    render(<AIAttributionBadge attribution={attribution} />);

    const badgeButton = screen.getByRole("button", { name: /ai generated/i });
    expect(badgeButton).toBeInTheDocument();

    fireEvent.click(badgeButton);

    expect(screen.getByText(/Personalized using collaboration signals/i)).toBeVisible();
    expect(screen.getAllByText(/Copy tone/i)[0]).toBeVisible();
  });

  it("renders fallback detail list when provided", () => {
    render(
      <AIAttributionBadge
        attribution={{
          source: "fallback",
          summary: "Using defaults",
          signals: [],
          fallbackDetails: ["LLM failure", "Used standard template"],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /fallback applied/i }));

    expect(screen.getByText(/LLM failure/i)).toBeVisible();
    expect(screen.getByText(/Used standard template/i)).toBeVisible();
  });
});
