"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, isPending, serverError, setServerError } = useLogin();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      await login(value);
    },
  });

  return (
    <>
      <div className="mb-1 flex items-center">
        <Image
          src="/healthnav-logo.svg"
          alt="HealthNavigator Logo"
          width={48}
          height={48}
          className="-ml-8 -mr-4 h-24 w-24 object-contain"
        />
        <span className="text-2xl font-bold tracking-tight text-primary">
          HealthNavigator
        </span>
      </div>

      <div className="mt-auto max-w-115">
        <h1 className="m-0 font-serif text-[72px] font-normal leading-[1] tracking-[-0.02em] text-ink">
          Welcome <span className="italic text-forest-deep">back.</span>
        </h1>

        <p className="mt-5 max-w-95 text-[15px] leading-relaxed text-ink-soft">
          Sign in to pick up where you left off — your consultations,
          prescriptions and care notes are waiting.
        </p>

        {serverError && (
          <div className="mt-6 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {serverError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="mt-9 flex flex-col gap-5"
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                const res = z
                  .email({ message: "Invalid email format" })
                  .safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.errors.length > 0;
              return (
                <RuleField
                  id={field.name}
                  label="Email address"
                  type="email"
                  placeholder="you@inbox.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  invalid={isInvalid}
                  error={
                    isInvalid ? field.state.meta.errors.join(", ") : undefined
                  }
                />
              );
            }}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const res = z
                  .string()
                  .min(6, { message: "Password must be at least 6 characters" })
                  .safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.errors.length > 0;
              return (
                <RuleField
                  id={field.name}
                  label="Password"
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  invalid={isInvalid}
                  error={
                    isInvalid ? field.state.meta.errors.join(", ") : undefined
                  }
                />
              );
            }}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={!canSubmit || isSubmitting || isPending}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>

      <div className="mt-4 mb-3 h-px w-full bg-ink/20" aria-hidden />
      <div className="text-center text-[13px] text-ink-soft">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-forest-deep underline underline-offset-[3px]"
        >
          Create an account
        </Link>
      </div>
    </>
  );
}

function RuleField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  invalid,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <div className="mb-2 text-[13px] font-medium text-ink-soft">{label}</div>
      <div
        data-invalid={invalid ? "" : undefined}
        className="group relative border-b border-rule pb-0.5 transition-colors focus-within:border-forest-deep data-[invalid]:border-destructive"
      >
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          className="w-full border-0 bg-transparent py-2 text-[17px] font-normal text-ink outline-none placeholder:text-ink-mute/70"
        />
      </div>
      {invalid && error && (
        <p role="alert" className="mt-1.5 text-[12px] font-normal text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}
