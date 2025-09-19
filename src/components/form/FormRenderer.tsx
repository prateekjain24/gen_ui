'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import * as React from 'react';

import { Field as FieldComponent } from './Field';
import { FormContainer } from './FormContainer';
import { Stepper } from './Stepper';

import { ExperimentalFieldComponent } from '@/components/form/experimental';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ENV } from '@/lib/constants';
import type { ButtonAction, Field, FormPlan } from '@/lib/types/form';
import { isErrorPlan, isRenderStepPlan, isReviewPlan, isSuccessPlan } from '@/lib/types/form';
import { cn } from '@/lib/utils';

interface FormRendererProps {
  plan: FormPlan;
  onAction?: (action: ButtonAction['action'], values: Record<string, unknown>) => void;
  onFieldChange?: (fieldId: string, value: string | string[] | undefined, stepId: string) => void;
  onFieldFocus?: (fieldId: string, stepId: string) => void;
  onFieldBlur?: (fieldId: string, stepId: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
  className?: string;
}

type FieldValues = Record<string, string | string[]>;

const getInitialFieldValues = (fields: Field[]): FieldValues => {
  return fields.reduce<FieldValues>((acc, field) => {
    switch (field.kind) {
      case 'checkbox':
      case 'integration_picker':
      case 'teammate_invite':
        acc[field.id] = Array.isArray(field.values) ? field.values : [];
        break;
      case 'select':
      case 'radio':
      case 'text':
      case 'admin_toggle':
        acc[field.id] = field.value ?? '';
        break;
      default:
        break;
    }
    return acc;
  }, {});
};

const StepSummary = ({ plan }: { plan: Extract<FormPlan, { kind: 'review' }> }) => {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Review your details</CardTitle>
        <CardDescription>Confirm the information below before finishing.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {plan.summary.map(item => (
            <div key={item.label} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
              <dd className="text-sm font-semibold text-foreground sm:text-right">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
};

const ResultCard = ({
  icon,
  title,
  message,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  tone: 'success' | 'error';
}) => {
  const toneClasses = tone === 'success' ? 'text-primary' : 'text-destructive';
  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <CardHeader className="items-center space-y-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-muted', toneClasses)}>{icon}</div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
};

export function FormRenderer({
  plan,
  onAction,
  onFieldChange,
  onFieldFocus,
  onFieldBlur,
  isSubmitting,
  error,
  className,
}: FormRendererProps) {
  const [fieldValues, setFieldValues] = React.useState<FieldValues>({});
  const isRenderStep = plan.kind === 'render_step';
  const activeStepId = isRenderStep ? plan.step.stepId : undefined;
  const fieldSignature = isRenderStep
    ? plan.step.fields.map(field => `${field.id}:${field.kind}`).join('|')
    : '';
  const enableExperimentalComponents = ENV.enableExperimentalComponents;

  React.useEffect(() => {
    if (!isRenderStep) {
      setFieldValues({});
      return;
    }
    setFieldValues(getInitialFieldValues(plan.step.fields));
  }, [isRenderStep, activeStepId, fieldSignature, plan]);

  const handleValueChange = (
    fieldId: string,
    value: string | string[] | undefined,
    stepId: string
  ) => {
    setFieldValues(current => ({ ...current, [fieldId]: value ?? '' }));
    onFieldChange?.(fieldId, value, stepId);
  };

  const handleAction = (action: ButtonAction['action']) => {
    if (!isRenderStepPlan(plan)) {
      onAction?.(action, {});
      return;
    }
    onAction?.(action, fieldValues);
  };

  if (isRenderStepPlan(plan)) {
    const { step, stepper } = plan;

    return (
      <div className={cn('space-y-6', className)}>
        <FormContainer
          title={step.title}
          description={step.description}
          primaryAction={step.primaryCta}
          secondaryAction={step.secondaryCta}
          onSubmit={(_, action) => handleAction(action.action)}
          onAction={action => handleAction(action)}
          stepper={<Stepper steps={stepper} activeStepId={activeStepId} />}
          isSubmitting={isSubmitting}
          error={error}
        >
          {step.fields.map(field => {
            if (field.kind === 'callout') {
              if (!enableExperimentalComponents) {
                return null;
              }
              return <ExperimentalFieldComponent key={field.id} kind="callout" field={field} />;
            }

            if (field.kind === 'checklist') {
              if (!enableExperimentalComponents) {
                return null;
              }
              return <ExperimentalFieldComponent key={field.id} kind="checklist" field={field} />;
            }

            if (field.kind === 'info_badge') {
              if (!enableExperimentalComponents) {
                return (
                  <span
                    key={field.id}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {field.label}
                  </span>
                );
              }
              return <ExperimentalFieldComponent key={field.id} kind="info_badge" field={field} />;
            }

            if (field.kind === 'ai_hint') {
              return <ExperimentalFieldComponent key={field.id} kind="ai_hint" field={field} />;
            }

            if (field.kind === 'integration_picker') {
              const currentValue = Array.isArray(fieldValues[field.id])
                ? (fieldValues[field.id] as string[])
                : Array.isArray(field.values)
                  ? field.values
                  : [];
              return (
                <ExperimentalFieldComponent
                  key={field.id}
                  kind="integration_picker"
                  field={field}
                  value={currentValue}
                  onChange={next => handleValueChange(field.id, next, step.stepId)}
                  onFocus={fieldId => onFieldFocus?.(fieldId, step.stepId)}
                  onBlur={fieldId => onFieldBlur?.(fieldId, step.stepId)}
                />
              );
            }

            if (field.kind === 'admin_toggle') {
              const currentValue =
                typeof fieldValues[field.id] === 'string'
                  ? (fieldValues[field.id] as string)
                  : field.value ?? '';
              return (
                <ExperimentalFieldComponent
                  key={field.id}
                  kind="admin_toggle"
                  field={field}
                  value={currentValue}
                  onChange={next => handleValueChange(field.id, next, step.stepId)}
                  onFocus={fieldId => onFieldFocus?.(fieldId, step.stepId)}
                  onBlur={fieldId => onFieldBlur?.(fieldId, step.stepId)}
                />
              );
            }

            if (field.kind === 'teammate_invite') {
              const currentValue = Array.isArray(fieldValues[field.id])
                ? (fieldValues[field.id] as string[])
                : Array.isArray(field.values)
                  ? field.values
                  : [];
              return (
                <ExperimentalFieldComponent
                  key={field.id}
                  kind="teammate_invite"
                  field={field}
                  value={currentValue}
                  onChange={next => handleValueChange(field.id, next, step.stepId)}
                  onFocus={fieldId => onFieldFocus?.(fieldId, step.stepId)}
                  onBlur={fieldId => onFieldBlur?.(fieldId, step.stepId)}
                />
              );
            }

            const primitiveField = field as Extract<Field, { kind: 'text' | 'select' | 'radio' | 'checkbox' }>;

            return (
              <FieldComponent
                key={primitiveField.id}
                field={primitiveField}
                stepId={step.stepId}
                value={fieldValues[primitiveField.id]}
                onValueChange={value => handleValueChange(primitiveField.id, value, step.stepId)}
                onFocus={(fieldId, stepId) => onFieldFocus?.(fieldId, stepId)}
                onBlur={(fieldId, stepId) => onFieldBlur?.(fieldId, stepId)}
              />
            );
          })}
        </FormContainer>
      </div>
    );
  }

  if (isReviewPlan(plan)) {
    return (
      <div className={cn('space-y-6', className)}>
        <Stepper steps={plan.stepper} activeStepId={activeStepId} />
        <StepSummary plan={plan} />
        <div className="mx-auto flex w-full max-w-2xl justify-end">
          <Button onClick={() => handleAction('complete')}>Confirm &amp; finish</Button>
        </div>
      </div>
    );
  }

  if (isSuccessPlan(plan)) {
    return (
      <ResultCard
        icon={<CheckCircle className="h-6 w-6" />}
        title="All set!"
        message={plan.message}
        tone="success"
      />
    );
  }

  if (isErrorPlan(plan)) {
    return (
      <ResultCard
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Something went wrong"
        message={plan.message}
        tone="error"
      />
    );
  }

  return null;
}
