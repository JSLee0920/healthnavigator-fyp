"use client";

import {
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

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
      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-4 overflow-hidden">
        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-foreground truncate text-sm md:text-base">
            {session.title || "New Consultation"}
          </span>
          <div className="flex items-center gap-2 mt-1 text-[11px] md:text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {new Date(session.last_active).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center pl-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Session actions"
              className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
    </div>
  );
}
