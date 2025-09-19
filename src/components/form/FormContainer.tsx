'use client';

import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { AIAttributionBadge } from '@/components/canvas/AIAttributionBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { AIAttribution } from '@/lib/types/ai';
import type { ButtonAction } from '@/lib/types/form';
import { cn } from '@/lib/utils';
import { debugError } from '@/lib/utils/debug';

interface FormContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  primaryAction: ButtonAction;
  secondaryAction?: ButtonAction;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>, action: ButtonAction) => void;
  onAction?: (action: ButtonAction['action']) => void;
  stepper?: React.ReactNode;
  className?: string;
  isSubmitting?: boolean;
  error?: string | null;
  footerContent?: React.ReactNode;
  titleAttribution?: AIAttribution;
  descriptionAttribution?: AIAttribution;
}

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface FormErrorBoundaryState {
  hasError: boolean;
}

class FormErrorBoundary extends React.Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  state: FormErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): FormErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    debugError('FormContainer render error', { error, info });
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <div className="font-medium text-destructive">Something went wrong while rendering the form.</div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBanner = ({ message }: { message?: string | null }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
};

export function FormContainer({
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  onSubmit,
  onAction,
  stepper,
  className,
  isSubmitting,
  error,
  footerContent,
  titleAttribution,
  descriptionAttribution,
}: FormContainerProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event, primaryAction);
    if (!onSubmit) {
      onAction?.(primaryAction.action);
    }
  };

  const handleSecondary = () => {
    if (!secondaryAction) return;
    onAction?.(secondaryAction.action);
  };

  return (
    <Card className={cn('mx-auto w-full max-w-2xl shadow-sm', className)}>
      {stepper ? <div className="border-b border-border/60 bg-muted/40 p-6">{stepper}</div> : null}
      <form onSubmit={handleSubmit} noValidate>
        <CardHeader>
          <CardTitle className="text-balance text-xl sm:text-2xl">
            <span className="flex items-start gap-2">
              <span className="flex-1 text-left">{title}</span>
              {titleAttribution ? <AIAttributionBadge attribution={titleAttribution} size="sm" /> : null}
            </span>
          </CardTitle>
          {description ? (
            <CardDescription className="flex items-start gap-2 text-sm sm:text-base">
              <span className="flex-1 text-left">{description}</span>
              {descriptionAttribution ? (
                <AIAttributionBadge attribution={descriptionAttribution} size="sm" className="mt-0.5" />
              ) : null}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <FormErrorBoundary>
            <div className="space-y-6">{children}</div>
          </FormErrorBoundary>
          <ErrorBanner message={error} />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-6">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="sm:min-w-[120px]">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {primaryAction.label}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {primaryAction.label}
                  {primaryAction.aiAttribution ? (
                    <AIAttributionBadge attribution={primaryAction.aiAttribution} size="sm" />
                  ) : null}
                </span>
              )}
            </Button>
            {secondaryAction ? (
              <Button
                type="button"
                variant="ghost"
                className="sm:min-w-[120px]"
                onClick={handleSecondary}
                disabled={isSubmitting}
              >
                <span className="flex items-center gap-2">
                  {secondaryAction.label}
                  {secondaryAction.aiAttribution ? (
                    <AIAttributionBadge attribution={secondaryAction.aiAttribution} size="sm" />
                  ) : null}
                </span>
              </Button>
            ) : null}
          </div>
          {footerContent ? <div className="text-sm text-muted-foreground">{footerContent}</div> : null}
        </CardFooter>
      </form>
    </Card>
  );
}
