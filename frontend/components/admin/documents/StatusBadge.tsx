"use client";

import { Loader2 } from "lucide-react";

import type { DocumentStatus } from "@/hooks/useDocuments";

interface StatusStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
  spin?: boolean;
}

const STATUS_CONFIG: Record<DocumentStatus, StatusStyle> = {
  pending: {
    bg: "var(--cream-2)",
    border: "var(--rule)",
    text: "var(--ink-mute)",
    label: "Pending",
  },
  processing: {
    bg: "oklch(0.94 0.04 240)",
    border: "oklch(0.82 0.08 240)",
    text: "oklch(0.42 0.13 250)",
    label: "Processing",
    spin: true,
  },
  completed: {
    bg: "var(--sage-soft)",
    border: "var(--sage)",
    text: "var(--forest-deep)",
    label: "Completed",
  },
  failed: {
    bg: "oklch(0.94 0.05 30)",
    border: "oklch(0.82 0.1 25)",
    text: "oklch(0.45 0.13 28)",
    label: "Failed",
  },
  deleting: {
    bg: "oklch(0.95 0.04 75)",
    border: "oklch(0.82 0.08 70)",
    text: "oklch(0.45 0.1 60)",
    label: "Deleting",
    spin: true,
  },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none [&>svg]:shrink-0"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {c.spin ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: c.text }}
        />
      )}
      <span>{c.label}</span>
    </span>
  );
}
