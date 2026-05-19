"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RuleField } from "@/components/ui/rule-field";
import { useRegister } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { register, isPending, serverError, setServerError } = useRegister();

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      await register(value);
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
        <h1 className="m-0 font-serif text-[64px] font-normal leading-none tracking-[-0.02em] text-ink">
          Create an <span className="italic text-forest-deep">account.</span>
        </h1>

        <p className="mt-5 max-w-95 text-[15px] leading-relaxed text-ink-soft">
          Join HealthNavigator to start your wellness journey.
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
            name="username"
            validators={{
              onChange: ({ value }) => {
                const res = z
                  .string()
                  .min(2, {
                    message: "Full name must be at least 2 characters",
                  })
                  .safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched;
              return (
                <RuleField
                  id={field.name}
                  label="Full Name"
                  placeholder="Jason Tan"
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
              const isInvalid =
                field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched;
              return (
                <RuleField
                  id={field.name}
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
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
                  .min(8, { message: "Password must be at least 8 characters" })
                  .safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched;
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

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) => {
                if (value !== fieldApi.form.getFieldValue("password")) {
                  return "Passwords do not match";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched;
              return (
                <RuleField
                  id={field.name}
                  label="Confirm Password"
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
                {(isSubmitting || isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>

      <div className="mt-4 mb-3 h-px w-full bg-ink/20" aria-hidden />
      <div className="text-center text-[13px] text-ink-soft">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-forest-deep underline underline-offset-[3px]"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
