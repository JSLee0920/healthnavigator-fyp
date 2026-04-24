"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      {/* Logo */}
      <div className="mb-1 flex items-center">
        <Image
          src="/healthnav-logo.svg"
          alt="HealthNavigator Logo"
          width={48}
          height={48}
          className="-ml-9 -mr-4 h-28 w-28 object-contain"
        />
        <span className="text-2xl font-bold tracking-tight text-primary">
          HealthNavigator
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Create an account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Join HealthNavigator to start your wellness journey.
        </p>
      </div>

      {/* Error Message */}
      {serverError && (
        <div className="mb-4 rounded-md bg-destructive/15 p-3 text-center text-sm font-medium text-destructive">
          {serverError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <FieldGroup>
          {/* Full Name Field */}
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
                <Field data-invalid={isInvalid ? "" : undefined}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Jason Tan"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && (
                    <FieldError className="text-xs text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </FieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>

          {/* Email Field */}
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
                <Field data-invalid={isInvalid ? "" : undefined}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="john@example.com"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && (
                    <FieldError className="text-xs text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </FieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>

          {/* Password Field */}
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const res = z
                  .string()
                  .min(8, {
                    message: "Password must be at least 8 characters",
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
                <Field data-invalid={isInvalid ? "" : undefined}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && (
                    <FieldError className="text-xs text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </FieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>

          {/* Confirm Password Field */}
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
                <Field data-invalid={isInvalid ? "" : undefined}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && (
                    <FieldError className="text-xs text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </FieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>

        {/* Submit Button */}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="mt-2 w-full bg-primary text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
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

      {/* Separator and Login Link */}
      <Separator
        orientation="horizontal"
        className="my-4 h-px w-full bg-gray-300"
      />
      <div className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-gray-900 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
