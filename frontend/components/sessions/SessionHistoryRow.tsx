"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatSession } from "@/hooks/useSessions";

interface SessionHistoryRowProps {
  session: ChatSession;
  isDeletePending: boolean;
  onOpen: (session: ChatSession) => void;
  onEdit: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
}

export function SessionHistoryRow({
  session,
  isDeletePending,
  onOpen,
  onEdit,
  onDelete,
}: SessionHistoryRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${session.title || "New Consultation"}`}
      onClick={() => onOpen(session)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(session);
        }
      }}
      className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-[12px] border border-rule bg-paper px-5 py-4 transition-colors hover:bg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
    >
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold text-ink md:text-[15px]">
          {session.title || "New Consultation"}
        </div>
        <div className="mt-1 truncate text-[10px] tracking-[0.06em] text-ink-mute md:text-[11px]">
          {new Date(session.last_active).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Session actions"
              className="h-8 w-8 rounded-md border border-transparent text-ink-mute transition-colors hover:border-rule hover:bg-cream hover:text-ink data-[state=open]:border-rule data-[state=open]:bg-cream data-[state=open]:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-44 border border-rule bg-cream p-1.5 shadow-md ring-0"
          >
            <DropdownMenuItem
              onClick={() => onEdit(session)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] leading-none text-ink focus:bg-sage-soft focus:text-forest-deep"
            >
              <Pencil className="h-4 w-4 shrink-0 text-ink-mute group-focus/dropdown-menu-item:text-forest-deep" />
              <span>Edit title</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isDeletePending}
              onClick={() => onDelete(session)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] leading-none"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
