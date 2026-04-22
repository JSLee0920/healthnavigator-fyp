"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
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

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const registerMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post("/users/", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: () => {
      router.push("/login?registered=true");
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setServerError(
          typeof detail === "string"
            ? detail
            : "Registration failed. Please try again.",
        );
      } else {
        setServerError("An unexpected error occured.");
      }
    },
  });

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      registerMutation.mutate(value);
    },
  });

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
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
            <h1 className="text-3xl font-bold text-primary">
              Create an account
            </h1>
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
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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
                  disabled={
                    !canSubmit || isSubmitting || registerMutation.isPending
                  }
                >
                  {(isSubmitting || registerMutation.isPending) && (
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
        </div>
      </div>

      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1db88e] to-[#0d7a5a] p-12 text-white lg:flex lg:w-1/2">
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
      </div>
    </div>
  );
}
