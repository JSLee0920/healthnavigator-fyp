"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAdminLogin } from "@/hooks/useAuth";

export default function AdminLoginPage() {
  const { login, isPending, serverError, setServerError } = useAdminLogin();

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
    <main className="flex min-h-screen bg-white">
      <section className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-1 flex items-center">
            <Image
              src="/healthnav-logo.svg"
              alt="HealthNavigator Logo"
              width={48}
              height={48}
              className="h-24 w-24 -ml-8 -mr-4 object-contain"
              priority
            />
            <span className="text-2xl font-bold text-primary tracking-tight">
              HealthNavigator
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary">Admin Login</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to access the HealthNavigator admin console.
            </p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
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
                    <Field data-invalid={isInvalid ? "" : undefined}>
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-gray-700 font-medium text-sm"
                      >
                        Email
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const res = z
                      .string()
                      .min(6, {
                        message: "Password must be at least 6 characters",
                      })
                      .safeParse(value);
                    return res.success ? undefined : res.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid ? "" : undefined}>
                      <div className="flex items-center justify-between">
                        <FieldLabel
                          htmlFor={field.name}
                          className="text-gray-700 font-medium text-sm"
                        >
                          Password
                        </FieldLabel>
                      </div>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="w-full bg-primary disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white mt-2"
                  disabled={!canSubmit || isSubmitting || isPending}
                >
                  {isSubmitting || isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <Separator
            orientation="horizontal"
            className="my-4 h-px w-full bg-gray-300"
          />
          <div className="mt-4 text-center text-sm text-gray-500">
            Patient account?{" "}
            <Link
              href="/login"
              className="font-semibold text-gray-900 hover:underline"
            >
              User sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1db88e] to-[#0d7a5a] p-12 text-white lg:flex lg:w-1/2">
        <Image
          src="/healthcare_logo.svg"
          alt="Healthcare Illustration"
          width={320}
          height={320}
          className="mb-10 h-64 w-64 object-contain md:h-80 md:w-80"
          priority
        />
        <div className="z-10 max-w-md text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            A Partner In Your
            <br />
            Health Journey
          </h2>
          <p className="text-lg text-emerald-50">
            Your personal companion for a<br />
            healthier, happier life.
          </p>
        </div>
      </section>
    </main>
  );
}
