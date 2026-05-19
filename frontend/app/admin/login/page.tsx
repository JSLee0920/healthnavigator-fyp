"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RuleField } from "@/components/ui/rule-field";
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
    <main className="flex min-h-screen bg-background">
      <section className="flex w-full flex-col justify-center px-6 py-10 lg:w-1/2">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <div className="mb-1 flex items-center">
            <Image
              src="/healthnav-logo.svg"
              alt="HealthNavigator Logo"
              width={48}
              height={48}
              className="-ml-8 -mr-4 h-24 w-24 object-contain"
              priority
            />
            <span className="text-2xl font-bold tracking-tight text-primary">
              HealthNavigator
            </span>
          </div>

          <div className="max-w-115">
            <h1 className="m-0 font-serif text-[64px] font-normal leading-none tracking-[-0.02em] text-ink">
              Admin <span className="italic text-forest-deep">Login</span>
            </h1>

            <p className="mt-5 max-w-95 text-[15px] leading-relaxed text-ink-soft">
              Sign in to access the HealthNavigator admin console.
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
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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
                      placeholder="admin@inbox.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(v) => field.handleChange(v)}
                      invalid={isInvalid}
                      error={
                        isInvalid
                          ? field.state.meta.errors.join(", ")
                          : undefined
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
                      .min(6, {
                        message: "Password must be at least 6 characters",
                      })
                      .safeParse(value);
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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
                        isInvalid
                          ? field.state.meta.errors.join(", ")
                          : undefined
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
                    {isSubmitting || isPending ? (
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
            User account?{" "}
            <Link
              href="/login"
              className="font-medium text-forest-deep underline underline-offset-[3px]"
            >
              User sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#1db88e] to-[#0d7a5a] p-12 text-white lg:flex lg:w-1/2">
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
