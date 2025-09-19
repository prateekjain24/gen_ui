"use client";

import { Check, Info, ShieldCheck, Sparkles } from 'lucide-react';
import * as React from 'react';

import { AIAttributionBadge } from '@/components/canvas/AIAttributionBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type {
  AIHintField,
  AdminToggleField,
  CalloutField,
  ChecklistField,
  InfoBadgeField,
  IntegrationPickerField,
  TeammateInviteField,
} from '@/lib/types/form';
import { cn } from '@/lib/utils';

export function CalloutBlock({ field }: { field: CalloutField }) {
  const VariantIcon = {
    success: ShieldCheck,
    warning: Info,
    info: Sparkles,
  }[field.variant ?? 'info'];

  const IconComp = VariantIcon ?? Sparkles;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/60 p-4 text-sm shadow-sm',
        field.variant === 'success' && 'border-emerald-400/60 bg-emerald-50 text-emerald-900',
        field.variant === 'warning' && 'border-amber-400/60 bg-amber-50 text-amber-900'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <IconComp className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-tight text-foreground">{field.label}</p>
            {field.aiAttribution ? <AIAttributionBadge attribution={field.aiAttribution} size="sm" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">{field.body}</p>
          {field.helperText ? (
            <p className="text-xs text-muted-foreground/80">{field.helperText}</p>
          ) : null}
          {field.cta ? (
            <a
              href={field.cta.href ?? '#'}
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              {field.cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ChecklistBlock({ field }: { field: ChecklistField }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{field.label}</p>
        {field.aiAttribution ? <AIAttributionBadge attribution={field.aiAttribution} size="sm" /> : null}
      </div>
      <ul className="space-y-2 text-sm">
        {field.items.map(item => (
          <li key={item.id} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-primary" />
            <span className="flex-1">
              <span className="font-medium text-foreground">{item.label}</span>
              {item.helperText ? (
                <span className="block text-xs text-muted-foreground">{item.helperText}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InfoBadgePill({ field }: { field: InfoBadgeField }) {
  const variantClass = {
    info: 'bg-blue-100 text-blue-900 border-blue-200',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-100 text-amber-900 border-amber-200',
    danger: 'bg-red-100 text-red-900 border-red-200',
  }[field.variant ?? 'info'];

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide',
          variantClass
        )}
      >
        {field.icon ? <span className="font-semibold">{field.icon}</span> : null}
        {field.label}
      </span>
      {field.aiAttribution ? <AIAttributionBadge attribution={field.aiAttribution} size="sm" /> : null}
    </div>
  );
}

export function AIHintNote({ field }: { field: AIHintField }) {
  return (
    <p className="text-xs italic text-muted-foreground">{field.body}</p>
  );
}

export interface IntegrationPickerProps {
  field: IntegrationPickerField;
  value: string[];
  onChange: (next: string[]) => void;
  onFocus?: (fieldId: string) => void;
  onBlur?: (fieldId: string) => void;
}

export function IntegrationPickerInput({ field, value, onChange, onFocus, onBlur }: IntegrationPickerProps) {
  const toggleValue = (option: string) => {
    const exists = value.includes(option);
    if (exists) {
      onChange(value.filter(item => item !== option));
    } else {
      const next = [...value, option];
      const limited = field.maxSelections ? next.slice(0, field.maxSelections) : next;
      onChange(limited);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-none text-foreground">{field.label}</p>
          {field.aiAttribution ? <AIAttributionBadge attribution={field.aiAttribution} size="sm" /> : null}
        </div>
        {field.categoryLabel ? (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{field.categoryLabel}</span>
        ) : null}
      </div>
      {field.helperText ? <p className="text-sm text-muted-foreground">{field.helperText}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {field.options.map(option => {
          const optionId = `${field.id}-${option.value}`;
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm shadow-sm transition hover:border-primary/60',
                checked && 'border-primary bg-primary/5 text-primary'
              )}
            >
              <Checkbox
                id={optionId}
                checked={checked}
                onCheckedChange={() => toggleValue(option.value)}
                onFocus={() => onFocus?.(field.id)}
                onBlur={() => onBlur?.(field.id)}
                className="mt-0.5"
              />
              <span className="grid gap-1">
                <span className="font-semibold leading-tight">{option.label}</span>
                {option.helperText ? (
                  <span className="text-xs text-muted-foreground">{option.helperText}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export interface AdminToggleProps {
  field: AdminToggleField;
  value: string;
  onChange: (next: string) => void;
  onFocus?: (fieldId: string) => void;
  onBlur?: (fieldId: string) => void;
}

export function AdminToggleInput({ field, value, onChange, onFocus, onBlur }: AdminToggleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium leading-none text-foreground">{field.label}</p>
        {field.aiAttribution ? <AIAttributionBadge attribution={field.aiAttribution} size="sm" /> : null}
      </div>
      {field.helperText ? <p className="text-sm text-muted-foreground">{field.helperText}</p> : null}
      <div className="inline-flex rounded-md border border-border/60 bg-background p-1 text-sm shadow-sm">
        {field.options.map(option => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                'rounded px-3 py-1.5 text-sm font-medium transition',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onChange(option.value)}
              onFocus={() => onFocus?.(field.id)}
              onBlur={() => onBlur?.(field.id)}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TeammateInviteProps {
  field: TeammateInviteField;
  value: string[];
  onChange: (next: string[]) => void;
  onFocus?: (fieldId: string) => void;
  onBlur?: (fieldId: string) => void;
}

export function TeammateInviteInput({ field, value, onChange, onFocus, onBlur }: TeammateInviteProps) {
  const [draft, setDraft] = React.useState('');

  const addInvite = () => {
    const email = draft.trim();
    if (!email || value.includes(email)) {
      setDraft('');
      return;
    }
    if (field.maxInvites && value.length >= field.maxInvites) {
      setDraft('');
      return;
    }
    onChange([...value, email]);
    setDraft('');
  };

  const removeInvite = (email: string) => {
    onChange(value.filter(item => item !== email));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none text-foreground">{field.label}</p>
      {field.helperText ? <p className="text-sm text-muted-foreground">{field.helperText}</p> : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={field.placeholder ?? 'teammate@email.com'}
          type="email"
          onFocus={() => onFocus?.(field.id)}
          onBlur={() => onBlur?.(field.id)}
        />
        <Button type="button" variant="secondary" onClick={addInvite}>
          Add
        </Button>
      </div>
      <ul className="space-y-1 text-sm">
        {value.map(email => (
          <li key={email} className="flex items-center justify-between rounded border border-border/60 bg-muted/40 px-3 py-2">
            <span className="font-medium text-foreground">{email}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeInvite(email)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type ExperimentalFieldComponentProps =
  | ({ kind: 'callout'; field: CalloutField })
  | ({ kind: 'checklist'; field: ChecklistField })
  | ({ kind: 'info_badge'; field: InfoBadgeField })
  | ({ kind: 'ai_hint'; field: AIHintField })
  | ({
      kind: 'integration_picker';
      field: IntegrationPickerField;
      value: string[];
      onChange: (next: string[]) => void;
      onFocus?: (fieldId: string) => void;
      onBlur?: (fieldId: string) => void;
    })
  | ({
      kind: 'admin_toggle';
      field: AdminToggleField;
      value: string;
      onChange: (next: string) => void;
      onFocus?: (fieldId: string) => void;
      onBlur?: (fieldId: string) => void;
    })
  | ({
      kind: 'teammate_invite';
      field: TeammateInviteField;
      value: string[];
      onChange: (next: string[]) => void;
      onFocus?: (fieldId: string) => void;
      onBlur?: (fieldId: string) => void;
    });

export function ExperimentalFieldComponent(props: ExperimentalFieldComponentProps) {
  switch (props.kind) {
    case 'callout':
      return <CalloutBlock field={props.field} />;
    case 'checklist':
      return <ChecklistBlock field={props.field} />;
    case 'info_badge':
      return <InfoBadgePill field={props.field} />;
    case 'ai_hint':
      return <AIHintNote field={props.field} />;
    case 'integration_picker':
      return (
        <IntegrationPickerInput
          field={props.field}
          value={props.value}
          onChange={props.onChange}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />
      );
    case 'admin_toggle':
      return (
        <AdminToggleInput
          field={props.field}
          value={props.value}
          onChange={props.onChange}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />
      );
    case 'teammate_invite':
      return (
        <TeammateInviteInput
          field={props.field}
          value={props.value}
          onChange={props.onChange}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />
      );
    default:
      return null;
  }
}
