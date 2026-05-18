"use client";

import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionTitle } from "@/components/sidebar/SessionTitle";
import type { ChatSession } from "@/hooks/useSessions";

interface SessionItemProps {
  session: ChatSession;
  isSelected: boolean;
  isLoading: boolean;
  isDeletePending: boolean;
  onSelect: (session: ChatSession) => void;
  onEdit: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
}

export function SessionItem({
  session,
  isSelected,
  isLoading,
  isDeletePending,
  onSelect,
  onEdit,
  onDelete,
}: SessionItemProps) {
  return (
    <div
      className={`group flex w-full items-center gap-1 rounded-[10px] pr-1 transition-colors ${isSelected ? "border border-sage bg-sage-soft" : "border border-transparent hover:bg-cream"}`}
    >
      <button
        onClick={() => onSelect(session)}
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden p-2.5 text-left"
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-mute" />
        )}
        <div className="flex flex-1 flex-col justify-center overflow-hidden">
          <SessionTitle title={session.title || ""} isSelected={isSelected} />
          {session.last_active && (
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-mute">
              {new Date(session.last_active).toLocaleDateString(undefined, {
                month: "short",
                day: "2-digit",
              })}
            </span>
          )}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${session.title || "New Consultation"}`}
            className="shrink-0 rounded-md p-2 text-ink-mute transition-opacity hover:bg-cream md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end">
          <DropdownMenuItem onClick={() => onEdit(session)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Title
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={isDeletePending}
            onClick={() => onDelete(session)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
