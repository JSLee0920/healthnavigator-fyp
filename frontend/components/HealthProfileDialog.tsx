"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HealthProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HealthProfileDialog({
  open,
  onOpenChange,
}: HealthProfileDialogProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ["health-profile"],
    queryFn: async () => {
      const response = await api.get("/users/user/health-profile");
      return response.data;
    },
    enabled: !!token && open,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const cleanedData = {
        gender: data.gender || existingProfile?.gender || null,
        date_of_birth: data.date_of_birth || existingProfile?.date_of_birth || null,
        height_cm: data.height_cm ? Number(data.height_cm) : existingProfile?.height_cm || null,
        weight_kg: data.weight_kg ? Number(data.weight_kg) : existingProfile?.weight_kg || null,
        blood_type: data.blood_type || existingProfile?.blood_type || null,
        chronic_conditions: (data.chronic_conditions as string[])?.filter(Boolean).length > 0
          ? (data.chronic_conditions as string[])?.filter(Boolean)
          : existingProfile?.chronic_conditions || [],
        allergies: (data.allergies as string[])?.filter(Boolean).length > 0
          ? (data.allergies as string[])?.filter(Boolean)
          : existingProfile?.allergies || [],
        current_medications: (data.current_medications as string[])?.filter(Boolean).length > 0
          ? (data.current_medications as string[])?.filter(Boolean)
          : existingProfile?.current_medications || [],
      };

      const response = await api.put("/users/user/health-profile", cleanedData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["health-profile"], data);
      setAuth(token!, { ...user!, health_profile: data });
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setServerError(
          typeof detail === "string" ? detail : "Failed to save health profile",
        );
      }
    },
  });

  const form = useForm({
    defaultValues: {
      gender: existingProfile?.gender || "",
      date_of_birth: existingProfile?.date_of_birth?.split("T")[0] || "",
      height_cm: existingProfile?.height_cm || "",
      weight_kg: existingProfile?.weight_kg || "",
      blood_type: existingProfile?.blood_type || "",
      chronic_conditions: existingProfile?.chronic_conditions || [],
      allergies: existingProfile?.allergies || [],
      current_medications: existingProfile?.current_medications || [],
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      updateProfileMutation.mutate(value);
    },
  });

  useEffect(() => {
    if (existingProfile && open) {
      form.setFieldValue("gender", existingProfile.gender || "");
      form.setFieldValue("date_of_birth", existingProfile.date_of_birth?.split("T")[0] || "");
      form.setFieldValue("height_cm", existingProfile.height_cm || "");
      form.setFieldValue("weight_kg", existingProfile.weight_kg || "");
      form.setFieldValue("blood_type", existingProfile.blood_type || "");
      form.setFieldValue("chronic_conditions", existingProfile.chronic_conditions || []);
      form.setFieldValue("allergies", existingProfile.allergies || []);
      form.setFieldValue("current_medications", existingProfile.current_medications || []);
    }
  }, [existingProfile, open]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Profile</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Health Profile</DialogTitle>
          <DialogDescription>
            Update your health information for personalized recommendations.
          </DialogDescription>
        </DialogHeader>

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
          <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <form.Field name="gender">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Gender</FieldLabel>
                  <select
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="date_of_birth"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const date = new Date(value);
                  if (isNaN(date.getTime())) return "Invalid date";
                  if (date > new Date()) return "Date cannot be in the future";
                  return undefined;
                },
              }}
            >
              {(field) => {
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid ? "" : undefined}>
                    <FieldLabel htmlFor={field.name}>Date of Birth</FieldLabel>
                    <Input
                      id={field.name}
                      type="date"
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
              name="height_cm"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const num = parseFloat(value as string);
                  if (isNaN(num)) return "Must be a number";
                  if (num < 50 || num > 300)
                    return "Height must be between 50-300 cm";
                  return undefined;
                },
              }}
            >
              {(field) => {
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid ? "" : undefined}>
                    <FieldLabel htmlFor={field.name}>Height (cm)</FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.1"
                      min="50"
                      max="300"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="e.g., 175"
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
              name="weight_kg"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const num = parseFloat(value as string);
                  if (isNaN(num)) return "Must be a number";
                  if (num < 1 || num > 500)
                    return "Weight must be between 1-500 kg";
                  return undefined;
                },
              }}
            >
              {(field) => {
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid ? "" : undefined}>
                    <FieldLabel htmlFor={field.name}>Weight (kg)</FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.1"
                      min="1"
                      max="500"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="e.g., 70"
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

            <form.Field name="blood_type">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Blood Type</FieldLabel>
                  <select
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Select blood type</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                      (type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              )}
            </form.Field>

            <form.Field name="chronic_conditions">
              {(field) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={field.name}>
                    Chronic Conditions
                    <span className="text-muted-foreground text-xs ml-2">
                      (comma-separated)
                    </span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={
                      Array.isArray(field.state.value)
                        ? field.state.value.join(", ")
                        : ""
                    }
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="allergies">
              {(field) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={field.name}>
                    Allergies
                    <span className="text-muted-foreground text-xs ml-2">
                      (comma-separated)
                    </span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={
                      Array.isArray(field.state.value)
                        ? field.state.value.join(", ")
                        : ""
                    }
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="e.g., Peanuts, Penicillin"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="current_medications">
              {(field) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={field.name}>
                    Current Medications
                    <span className="text-muted-foreground text-xs ml-2">
                      (comma-separated)
                    </span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={
                      Array.isArray(field.state.value)
                        ? field.state.value.join(", ")
                        : ""
                    }
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="e.g., Metformin, Lisinopril"
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    updateProfileMutation.isPending
                  }
                >
                  {(isSubmitting || updateProfileMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Profile
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

