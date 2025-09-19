/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

import { ReasoningChip } from "../ReasoningChip";

describe("ReasoningChip", () => {
  it("renders reasoning text", () => {
    render(<ReasoningChip reasoning="Team setup detected" />);

    expect(screen.getByText("Team setup detected")).toBeInTheDocument();
    const chip = screen.getByRole("note");
    expect(chip).toHaveClass("rounded-full");
  });

  it("displays tags inline", () => {
    render(<ReasoningChip reasoning="Governance signals" tags={["governance", "audit"]} />);

    expect(screen.getByText("governance")).toHaveClass("bg-muted");
    expect(screen.getByText("audit")).toHaveClass("bg-muted");
  });
});
