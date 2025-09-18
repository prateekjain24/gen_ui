'use client';

import * as React from 'react';

import type { StepperItem } from '@/lib/types/form';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: StepperItem[];
  className?: string;
  activeStepId?: string;
}

export function Stepper({ steps, className, activeStepId }: StepperProps) {
  const total = steps.length;
  const completed = steps.filter(step => step.completed).length;
  const activeIndex = steps.findIndex(step => (activeStepId ? step.id === activeStepId : step.active));
  const progress = total > 0
    ? Math.min(100, Math.round(((completed + (activeIndex >= 0 ? 0.5 : 0)) / total) * 100))
    : 0;

  return (
    <div className={cn('space-y-3', className)} aria-label="Progress">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
      <ol className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm" role="list">
        {steps.map((step, index) => {
          const isActive = activeStepId ? step.id === activeStepId : step.active;
          const state = isActive ? 'active' : step.completed ? 'completed' : 'upcoming';
          return (
            <li
              key={step.id}
              className={cn(
                'flex min-w-[72px] flex-1 items-center gap-2 transition-colors duration-200',
                state === 'active' && 'text-primary',
                state === 'completed' && 'text-muted-foreground',
                state === 'upcoming' && 'text-muted-foreground/70'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                  state === 'active' && 'border-primary bg-primary text-primary-foreground',
                  state === 'completed' && 'border-border bg-background text-muted-foreground',
                  state === 'upcoming' && 'border-border'
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="flex flex-col">
                <span className="font-medium leading-none">{step.label}</span>
                <span className="text-[11px] text-muted-foreground/80">
                  {state === 'active' ? 'In progress' : state === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
