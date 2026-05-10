"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  FileText,
  Loader2,
  LogOut,
  Upload,
} from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAdminUpload } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function validatePdf(file: File | null) {
  if (!file) return "Select a PDF document";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF documents are accepted";
  if (file.size > MAX_FILE_SIZE) return "PDF must be 20 MB or smaller";
  return undefined;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, _hasHydrated, logout } = useAuthStore();
  const {
    upload,
    isPending,
    serverError,
    successMessage,
    setServerError,
    setSuccessMessage,
  } = useAdminUpload();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/admin/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/chat");
    }
  }, [_hasHydrated, isAuthenticated, router, user?.role]);

  const form = useForm({
    defaultValues: {
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      const error = validatePdf(value.file);
      if (error || !value.file) {
        setServerError(error ?? "Select a PDF document");
        return;
      }

      setServerError("");
      setSuccessMessage("");
      await upload(value.file);
      form.reset();
    },
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
    router.push("/admin/login");
  };

  if (!_hasHydrated || !isAuthenticated || user?.role !== "admin") return null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                Admin Console
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/chat")}
            >
              <ArrowLeft className="h-4 w-4" />
              Chat
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">
              Upload Knowledge Base Document
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a PDF to the backend ingestion queue for retrieval updates.
            </p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-md bg-primary/10 p-3 text-sm font-medium text-primary">
              {successMessage}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            <FieldGroup>
              <form.Field
                name="file"
                validators={{
                  onChange: ({ value }) => validatePdf(value),
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  const file = field.state.value;
                  return (
                    <Field data-invalid={isInvalid ? "" : undefined}>
                      <FieldLabel htmlFor={field.name}>PDF document</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="file"
                        accept="application/pdf,.pdf"
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          setServerError("");
                          setSuccessMessage("");
                          field.handleChange(e.target.files?.[0] ?? null);
                        }}
                        aria-invalid={isInvalid}
                      />
                      <FieldDescription>
                        Accepted format: PDF. Maximum size: 20 MB.
                      </FieldDescription>
                      {file && !isInvalid && (
                        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="min-w-0 flex-1 truncate">
                            {file.name}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      )}
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
                  disabled={!canSubmit || isSubmitting || isPending}
                >
                  {(isSubmitting || isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Upload PDF
                </Button>
              )}
            </form.Subscribe>
          </form>
        </section>

        <aside className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Ingestion Status</h2>
          <Separator className="my-4" />
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Backend accepts one PDF per upload and starts embedding in a
              background task.
            </p>
            <p>
              Keep filename clear and unique. Uploaded files are stored in
              `data/raw_data` before ingestion.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
