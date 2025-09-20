import type { Metadata } from "next";

import { CanvasChat } from "@/components/canvas/CanvasChat";
import { isPersonalizationEnabled } from "@/lib/config/toggles";

export const metadata: Metadata = {
  title: "Canvas Chat",
  description: "Generate onboarding experiences from a single prompt.",
};

export default function Home() {
  return <CanvasChat personalizationEnabled={isPersonalizationEnabled()} />;
}
