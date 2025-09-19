"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStaggeredMount } from "@/hooks/useStaggeredMount";
import { cn } from "@/lib/utils";

const examplePrompts = [
  "Create a quickstart workspace for my design sprint",
  "Help me onboard a new analytics contractor",
  "Draft a setup flow for a 5-person sales team",
];

export function CanvasChat(): React.ReactElement {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState<string | null>(null);
  const [animationKey, setAnimationKey] = React.useState(0);
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
      setAnimationKey(value => value + 1);
    },
    [prompt]
  );

  const handleExampleClick = React.useCallback((value: string) => {
    setPrompt(value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const previewFields = React.useMemo(
    () =>
      submittedPrompt
        ? [
            {
              id: "intro",
              label: "Quick context",
              description: "We picked a starter layout so you can iterate fast.",
            },
            {
              id: "workspace",
              label: "Workspace name",
              description: "Give this plan a title so teammates know where to start.",
            },
            {
              id: "integrations",
              label: "Recommended integrations",
              description: "Slack and Jira are pre-selected based on your request.",
            },
            {
              id: "invites",
              label: "Invite collaborators",
              description: "Add teammates now or follow up after reviewing the plan.",
            },
          ]
        : [],
    [submittedPrompt]
  );

  const { getAnimationStyle, motionEnabled } = useStaggeredMount(previewFields.length, {
    intervalMs: 65,
    key: [animationKey],
    disabled: previewFields.length === 0,
  });

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
          {previewFields.length === 0 ? (
            <Card className="flex flex-1 flex-col justify-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Your tailored workspace will appear here</h2>
              <p className="text-sm text-muted-foreground">
                Start by sharing what you are working on. Canvas Chat will assemble the screens and steps for you.
              </p>
            </Card>
          ) : (
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex flex-col gap-1 text-left">
                <h2 className="text-xl font-semibold text-foreground">Assembling a plan for “{submittedPrompt}”</h2>
                <p className="text-sm text-muted-foreground">
                  Watch the key components fade in—Canvas will render the full flow once the classifier responds.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {previewFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      "rounded-lg border border-border/60 bg-card p-4 shadow-sm",
                      motionEnabled && "stagger-fade-in"
                    )}
                    style={motionEnabled ? getAnimationStyle(index) : undefined}
                  >
                    <p className="text-sm font-semibold text-foreground">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
