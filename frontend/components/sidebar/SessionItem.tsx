"use client";

import { Loader2, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
      className={`group flex items-center transition-all w-full gap-1 rounded-xl pr-1 ${isSelected ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border" : "hover:bg-accent/50"}`}
    >
      <button
        onClick={() => onSelect(session)}
        className="flex items-center text-left overflow-hidden min-w-0 flex-1 gap-3 p-3"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <MessageSquare
            className={`h-4 w-4 shrink-0 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
          />
        )}
        <div className="flex flex-1 flex-col overflow-hidden justify-center">
          <SessionTitle title={session.title || ""} isSelected={isSelected} />
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 text-muted-foreground transition-opacity hover:bg-muted rounded-lg md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 shrink-0"
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
