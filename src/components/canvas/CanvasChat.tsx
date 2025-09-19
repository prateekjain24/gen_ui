"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const examplePrompts = [
  "Create a quickstart workspace for my design sprint",
  "Help me onboard a new analytics contractor",
  "Draft a setup flow for a 5-person sales team",
];

export function CanvasChat(): React.ReactElement {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = prompt.trim();
      if (!trimmed) {
        return;
      }

      // Stub submission until LLM integration lands.
      console.warn("CanvasChat submission pending integration", trimmed);
      setSubmittedPrompt(trimmed);
    },
    [prompt]
  );

  const handleExampleClick = React.useCallback((value: string) => {
    setPrompt(value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16 md:px-8">
        <header className="flex flex-col gap-3 text-center md:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Canvas Chat</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What do you want to get done today?
          </h1>
          <p className="text-muted-foreground">
            Describe the onboarding or workspace experience you need and we&apos;ll turn it into a tailored flow.
          </p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={inputRef}
              aria-label="Describe what you want to build"
              placeholder="e.g. Build a workspace to welcome new clients"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="w-full sm:w-auto">
              Generate
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {examplePrompts.map(example => (
              <Button
                key={example}
                type="button"
                variant="ghost"
                size="sm"
                className="border border-dashed border-input"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </form>

        <section className="flex flex-1 flex-col">
          <Card className="flex flex-1 flex-col justify-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground">Your tailored workspace will appear here</h2>
            <p className="text-sm text-muted-foreground">
              {submittedPrompt
                ? `We're sketching concepts for: "${submittedPrompt}". Come back soon to see the generated UI.`
                : "Start by sharing what you are working on. Canvas Chat will assemble the screens and steps for you."}
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
