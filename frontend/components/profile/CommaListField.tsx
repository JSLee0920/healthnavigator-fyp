"use client";

import { useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface CommaListFieldArg {
  name: string;
  state: { value: string[] | undefined };
  handleBlur: () => void;
  handleChange: (value: string[]) => void;
}

interface CommaListFieldProps {
  field: CommaListFieldArg;
  label: string;
  placeholder: string;
}

export function CommaListField({ field, label, placeholder }: CommaListFieldProps) {
  const joined = Array.isArray(field.state.value)
    ? field.state.value.join(", ")
    : "";
  const [text, setText] = useState(joined);
  const [prevJoined, setPrevJoined] = useState(joined);
  const [isFocused, setIsFocused] = useState(false);

  if (joined !== prevJoined) {
    setPrevJoined(joined);
    if (!isFocused) {
      setText(joined);
    }
  }

  return (
    <Field className="sm:col-span-2">
      <FieldLabel htmlFor={field.name}>
        {label}
        <span className="text-muted-foreground text-xs ml-2">
          (comma-separated)
        </span>
      </FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={text}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          setText(joined);
          field.handleBlur();
        }}
        onChange={(e) => {
          setText(e.target.value);
          field.handleChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
        placeholder={placeholder}
      />
    </Field>
  );
}
