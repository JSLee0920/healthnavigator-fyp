"use client";

import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentStatus } from "@/hooks/useDocuments";

const ALL_STATUSES = "__all__";

const STATUS_OPTIONS: {
  value: typeof ALL_STATUSES | DocumentStatus;
  label: string;
}[] = [
  { value: ALL_STATUSES, label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "deleting", label: "Deleting" },
];

interface DocumentsFiltersProps {
  search: string;
  status: "" | DocumentStatus;
  isFetching: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "" | DocumentStatus) => void;
  onRefresh: () => void;
}

export function DocumentsFilters({
  search,
  status,
  isFetching,
  onSearchChange,
  onStatusChange,
  onRefresh,
}: DocumentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by filename..."
          aria-label="Search documents by filename"
          className="pl-9"
        />
      </div>
      <Select
        value={status === "" ? ALL_STATUSES : status}
        onValueChange={(v) =>
          onStatusChange(v === ALL_STATUSES ? "" : (v as DocumentStatus))
        }
      >
        <SelectTrigger aria-label="Filter documents by status" className="w-45">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent position="popper">
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={isFetching}
        className="gap-1.5"
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
