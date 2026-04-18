"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { HeartPulse } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <HeartPulse className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join HealthNavigator to start your wellness journey
          </p>
        </div>

        {serverError && (
          <div className="mb-6 rounded-lg bg-destructive/15 p-4 text-sm font-medium text-destructive text-center">
            {serverError}
          </div>
        )}
      </div>
    </div>
  );
}
