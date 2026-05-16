"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface NumberFieldArg {
  name: string;
  state: {
    value: string | number;
    meta: { errors: unknown[] };
  };
  handleBlur: () => void;
  handleChange: (value: string) => void;
}

interface NumberRangeFieldProps {
  field: NumberFieldArg;
  label: string;
  min: number;
  max: number;
  step?: string;
  placeholder?: string;
}

export function NumberRangeField({
  field,
  label,
  min,
  max,
  step = "0.1",
  placeholder,
}: NumberRangeFieldProps) {
  const isInvalid = field.state.meta.errors.length > 0;
  return (
    <Field data-invalid={isInvalid ? "" : undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        type="number"
        step={step}
        min={min}
        max={max}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={placeholder}
      />
      {isInvalid && <FieldError>{field.state.meta.errors.join(", ")}</FieldError>}
    </Field>
  );
}

export const numberRangeValidator =
  (min: number, max: number, fieldLabel: string) =>
  ({ value }: { value: string | number }) => {
    if (!value && value !== 0) return undefined;
    const num = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(num)) return "Must be a number";
    if (num < min || num > max) return `${fieldLabel} must be between ${min}-${max}`;
    return undefined;
  };
