"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import Link from "next/link";
import Image from "next/image";

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
import { Separator } from "@/components/ui/separator";

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

        const { access_token } = response.data;

        const userResponse = await api.get("/users/user", {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        const userData = userResponse.data;

        setAuth(access_token, userData);

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
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col items-center justify-center lg:w-1/2">
        <div className="w-full max-w-100">
          <div className="mb-1 flex items-center">
            <Image
              src="/healthnav-logo.svg"
              alt="HealthNavigator Logo"
              width={48}
              height={48}
              className="h-24 w-24 -ml-8 -mr-4 object-contain"
            />
            <span className="text-2xl font-bold text-primary tracking-tight">
              HealthNavigator
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary">Welcome Back!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to access HealthNavigator, your friendly healthcare
              chatbot.
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
                    return res.success
                      ? undefined
                      : res.error.issues[0]?.message;
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

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="w-full bg-primary disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white mt-2"
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

          <Separator
            orientation="horizontal"
            className="my-4 h-px w-full bg-gray-300"
          />
          <div className="mt-4 text-center text-sm text-gray-500">
            <div className="mt-2">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-gray-900 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#1db88e] to-[#0d7a5a] flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <Image
          src="/healthcare_logo.svg"
          alt="Healthcare Illustration"
          width={320}
          height={320}
          className="mb-10 h-64 w-64 object-contain md:h-80 md:w-80"
          priority
        />

        <div className="text-center max-w-md z-10">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">
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
