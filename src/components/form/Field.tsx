'use client';

import * as React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Field as FormField } from '@/lib/types/form';
import { cn } from '@/lib/utils';

export interface FieldProps {
  field: FormField;
  stepId: string;
  value?: string | string[];
  onValueChange: (value: string | string[] | undefined) => void;
  onFocus?: (fieldId: string, stepId: string) => void;
  onBlur?: (fieldId: string, stepId: string) => void;
}

const HelperText = ({ id, children }: { id?: string; children?: React.ReactNode }) => {
  if (!children) {
    return null;
  }
  return (
    <p id={id} className="text-sm text-muted-foreground">
      {children}
    </p>
  );
};

const ErrorText = ({ id, children }: { id?: string; children?: React.ReactNode }) => {
  if (!children) {
    return null;
  }
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {children}
    </p>
  );
};

export function Field({ field, stepId, value, onValueChange, onFocus, onBlur }: FieldProps) {
  const describedById = field.helperText ? `${field.id}-description` : undefined;
  const errorId = field.errorMessage ? `${field.id}-error` : undefined;
  const ariaDescribedBy = [errorId, describedById].filter(Boolean).join(' ') || undefined;

  switch (field.kind) {
    case 'text': {
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
          <Input
            id={field.id}
            name={field.id}
            type={field.type ?? 'text'}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            value={typeof value === 'string' ? value : field.value ?? ''}
            pattern={field.pattern}
            minLength={field.minLength}
            maxLength={field.maxLength}
            autoComplete={field.autocomplete}
            aria-describedby={ariaDescribedBy}
            aria-invalid={Boolean(field.errorMessage)}
            onFocus={() => onFocus?.(field.id, stepId)}
            onBlur={() => onBlur?.(field.id, stepId)}
            onChange={event => onValueChange(event.target.value)}
          />
          <HelperText id={describedById}>{field.helperText}</HelperText>
          <ErrorText id={errorId}>{field.errorMessage}</ErrorText>
        </div>
      );
    }

    case 'radio': {
      const orientation = field.orientation ?? 'vertical';
      const currentValue = typeof value === 'string' ? value : field.value;
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
          </legend>
          <RadioGroup
            name={field.id}
            value={currentValue}
            orientation={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
            className={cn(orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3')}
            onValueChange={nextValue => onValueChange(nextValue)}
          >
            {field.options.map(option => {
              const optionId = `${field.id}-${option.value}`;
              return (
                <label
                  key={option.value}
                  htmlFor={optionId}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <RadioGroupItem
                    id={optionId}
                    value={option.value}
                    disabled={field.disabled || option.disabled}
                    onFocus={() => onFocus?.(field.id, stepId)}
                    onBlur={() => onBlur?.(field.id, stepId)}
                    className="mt-1"
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-medium leading-none">{option.label}</span>
                    {'helperText' in option && option.helperText ? (
                      <span className="text-xs text-muted-foreground">{option.helperText}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
          <HelperText id={describedById}>{field.helperText}</HelperText>
          <ErrorText id={errorId}>{field.errorMessage}</ErrorText>
        </fieldset>
      );
    }

    case 'checkbox': {
      const orientation = field.orientation ?? 'vertical';
      const selectedValues = Array.isArray(value)
        ? value
        : Array.isArray(field.values)
          ? field.values
          : [];
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
          </legend>
          <div className={cn(orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3')}>
            {field.options.map(option => {
              const optionId = `${field.id}-${option.value}`;
              const isChecked = selectedValues.includes(option.value);
              return (
                <label key={option.value} htmlFor={optionId} className="flex cursor-pointer items-start gap-2">
                  <Checkbox
                    id={optionId}
                    checked={isChecked}
                    disabled={field.disabled || option.disabled}
                    onCheckedChange={checked => {
                      const isSelected = checked === true;
                      const nextValues = isSelected
                        ? Array.from(new Set([...selectedValues, option.value]))
                        : selectedValues.filter(item => item !== option.value);
                      onValueChange(nextValues);
                    }}
                    onFocus={() => onFocus?.(field.id, stepId)}
                    onBlur={() => onBlur?.(field.id, stepId)}
                    className="mt-1"
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-medium leading-none">{option.label}</span>
                    {'helperText' in option && option.helperText ? (
                      <span className="text-xs text-muted-foreground">{option.helperText}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          <HelperText id={describedById}>{field.helperText}</HelperText>
          <ErrorText id={errorId}>{field.errorMessage}</ErrorText>
        </fieldset>
      );
    }

    case 'select': {
      const currentValue = typeof value === 'string' ? value : field.value ?? '';
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
          <Select
            value={currentValue || undefined}
            onValueChange={selected => onValueChange(selected)}
            disabled={field.disabled}
          >
            <SelectTrigger
              id={field.id}
              aria-describedby={ariaDescribedBy}
              aria-invalid={Boolean(field.errorMessage)}
              onFocus={() => onFocus?.(field.id, stepId)}
              onBlur={() => onBlur?.(field.id, stepId)}
            >
              <SelectValue placeholder={field.placeholder ?? 'Select option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(option => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <HelperText id={describedById}>{field.helperText}</HelperText>
          <ErrorText id={errorId}>{field.errorMessage}</ErrorText>
        </div>
      );
    }

    default:
      return null;
  }
}
