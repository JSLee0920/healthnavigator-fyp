"use client";

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/hooks/useDocuments";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { variant: BadgeVariant; className: string; label: string; spin?: boolean }
> = {
  pending: {
    variant: "outline",
    className: "text-muted-foreground",
    label: "Pending",
  },
  processing: {
    variant: "outline",
    className:
      "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    label: "Processing",
    spin: true,
  },
  completed: {
    variant: "outline",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Completed",
  },
  failed: {
    variant: "destructive",
    className: "",
    label: "Failed",
  },
  deleting: {
    variant: "outline",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "Deleting",
    spin: true,
  },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <Badge variant={c.variant} className={c.className}>
      {c.spin ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {c.label}
    </Badge>
  );
}
