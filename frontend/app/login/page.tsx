"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

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
        const response = await api.post("/auth/login", {
          email: value.email,
          password: value.password,
        });

        const { access_token, user } = response.data;
        setAuth(access_token, user);
        router.push("/chat");
      } catch (err) {
        if (isAxiosError(err)) {
          setServerError(
            err.response?.data?.detail ||
              "Failed to login. Check your credentials.",
          );
        } else {
          setServerError("An unexpected error occurred.");
        }
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">HealthNavigator</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500">
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
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const res = z
                  .string()
                  .min(6, { message: "Password must be at least 6 characters" })
                  .safeParse(value);
                return res.success ? undefined : res.error.issues[0].message;
              },
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
