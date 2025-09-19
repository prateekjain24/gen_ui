/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

import { PersonaBadge } from "../PersonaBadge";

describe("PersonaBadge", () => {
  it("renders explorer persona with default styling", () => {
    render(<PersonaBadge persona="explorer" />);

    const badge = screen.getByLabelText(/Explorer persona/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Explorer");
    expect(badge).toHaveClass("bg-sky-100");
    expect(badge).toHaveClass("text-sky-900");
  });

  it("shows confidence when provided", () => {
    render(<PersonaBadge persona="team" confidence={0.724} />);

    const badge = screen.getByLabelText(/Team persona/i);
    expect(badge).toHaveTextContent("Confidence 72%");
  });

  it("clamps confidence to 100 percent maximum", () => {
    render(<PersonaBadge persona="power" confidence={1.2} />);

    const badge = screen.getByLabelText(/Power persona/i);
    expect(badge).toHaveClass("bg-amber-100");
    expect(badge).toHaveTextContent("Confidence 100%");
  });
});
