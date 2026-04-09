"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },

    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        const response = await api.post(
          "/auth/login",
          {
            username: value.email,
            password: value.password,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        const { access_token, user } = response.data;
        setAuth(access_token, user);
        router.push("/chat");
      } catch (err) {
        if (isAxiosError(err)) {
          const detail = err.response?.data?.detail;

          if (Array.isArray(detail)) {
            const messages = detail.map((d: { msg: string }) => d.msg);
            setServerError(messages.join(", "));
          } else if (typeof detail === "string") {
            setServerError(detail);
          } else {
            setServerError("Failed to login. Check your credentials.");
          }
        } else {
          setServerError("An unexpected error occurred.");
        }
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl bg-card border-border p-8 shadow-lg text-card-foreground">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            HealthNavigator
          </h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
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
          className="space-y-6"
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
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError>
                        {field.state.meta.errors.join(", ")}
                      </FieldError>
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
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
                      <FieldError>
                        {field.state.meta.errors.join(", ")}
                      </FieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>{" "}
          </FieldGroup>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || isSubmitting}
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
    </div>
  );
}
