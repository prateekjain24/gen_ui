import type { Metadata } from "next";

import { CanvasChat } from "@/components/canvas/CanvasChat";

export const metadata: Metadata = {
  title: "Canvas Chat",
  description: "Generate onboarding experiences from a single prompt.",
};

export default function CanvasPage() {
  return <CanvasChat />;
}
