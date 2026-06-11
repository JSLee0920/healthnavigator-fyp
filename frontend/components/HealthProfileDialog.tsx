"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommaListField } from "@/components/profile/CommaListField";
import {
  NumberRangeField,
  numberRangeValidator,
} from "@/components/profile/NumberRangeField";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/store/authStore";

interface HealthProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HealthProfileDialog({
  open,
  onOpenChange,
}: HealthProfileDialogProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ["health-profile", user?.email],
    queryFn: async () => {
      const response = await api.get("/users/user/health-profile");
      return response.data;
    },
    enabled: !!isAuthenticated && open && !!user?.email,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const cleanedData = {
        gender: data.gender || existingProfile?.gender || null,
        date_of_birth:
          data.date_of_birth || existingProfile?.date_of_birth || null,
        height_cm: data.height_cm
          ? Number(data.height_cm)
          : existingProfile?.height_cm || null,
        weight_kg: data.weight_kg
          ? Number(data.weight_kg)
          : existingProfile?.weight_kg || null,
        blood_type: data.blood_type || existingProfile?.blood_type || null,
        chronic_conditions:
          (data.chronic_conditions as string[])?.filter(Boolean).length > 0
            ? (data.chronic_conditions as string[])?.filter(Boolean)
            : existingProfile?.chronic_conditions || [],
        allergies:
          (data.allergies as string[])?.filter(Boolean).length > 0
            ? (data.allergies as string[])?.filter(Boolean)
            : existingProfile?.allergies || [],
        current_medications:
          (data.current_medications as string[])?.filter(Boolean).length > 0
            ? (data.current_medications as string[])?.filter(Boolean)
            : existingProfile?.current_medications || [],
      };

      const response = await api.put("/users/user/health-profile", cleanedData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["health-profile", user?.email], data);
      queryClient.invalidateQueries({
        queryKey: ["health-profile", user?.email],
      });
      setUser({ ...user!, health_profile: data });
      toast.success("Health Profile Saved");
      onOpenChange(false);
    },
    onError: (error) =>
      setServerError(getErrorMessage(error, "Failed to save health profile")),
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
      form.setFieldValue(
        "date_of_birth",
        existingProfile.date_of_birth?.split("T")[0] || "",
      );
      form.setFieldValue("height_cm", existingProfile.height_cm || "");
      form.setFieldValue("weight_kg", existingProfile.weight_kg || "");
      form.setFieldValue("blood_type", existingProfile.blood_type || "");
      form.setFieldValue(
        "chronic_conditions",
        existingProfile.chronic_conditions || [],
      );
      form.setFieldValue("allergies", existingProfile.allergies || []);
      form.setFieldValue(
        "current_medications",
        existingProfile.current_medications || [],
      );
    }
  }, [existingProfile, form, open]);

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
          <DialogTitle className="text-xl">Health Profile</DialogTitle>
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
          noValidate
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
                    className={selectClass}
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
              validators={{ onChange: numberRangeValidator(50, 300, "Height") }}
            >
              {(field) => (
                <NumberRangeField
                  field={field}
                  label="Height (cm)"
                  min={50}
                  max={300}
                  placeholder="e.g., 175"
                />
              )}
            </form.Field>

            <form.Field
              name="weight_kg"
              validators={{ onChange: numberRangeValidator(1, 500, "Weight") }}
            >
              {(field) => (
                <NumberRangeField
                  field={field}
                  label="Weight (kg)"
                  min={1}
                  max={500}
                  placeholder="e.g., 70"
                />
              )}
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
                    className={selectClass}
                  >
                    <option value="">Select blood type</option>
                    {BLOOD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </form.Field>

            <form.Field name="chronic_conditions">
              {(field) => (
                <CommaListField
                  field={field}
                  label="Chronic Conditions"
                  placeholder="e.g., Diabetes, Hypertension"
                />
              )}
            </form.Field>

            <form.Field name="allergies">
              {(field) => (
                <CommaListField
                  field={field}
                  label="Allergies"
                  placeholder="e.g., Peanuts, Penicillin"
                />
              )}
            </form.Field>

            <form.Field name="current_medications">
              {(field) => (
                <CommaListField
                  field={field}
                  label="Current Medications"
                  placeholder="e.g., Metformin, Lisinopril"
                />
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
