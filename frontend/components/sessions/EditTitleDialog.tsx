"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatSession } from "@/hooks/useSessions";

interface EditTitleDialogProps {
  session: ChatSession | null;
  isPending?: boolean;
  onCancel: () => void;
  onSave: (session: ChatSession, title: string) => void;
}

export function EditTitleDialog({
  session,
  isPending,
  onCancel,
  onSave,
}: EditTitleDialogProps) {
  const [title, setTitle] = useState(session?.title || "");
  // Compare by id so a parent re-render passing an equivalent ChatSession
  // object doesn't blow away in-progress edits. setState-in-render is the
  // pattern React docs recommend over a setState-in-effect.
  const [prevSessionId, setPrevSessionId] = useState(session?.session_id ?? null);
  const sessionId = session?.session_id ?? null;
  if (sessionId !== prevSessionId) {
    setPrevSessionId(sessionId);
    setTitle(session?.title || "");
  }

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed && session) onSave(session, trimmed);
  };

  return (
    <Dialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Consultation Title</DialogTitle>
          <DialogDescription>
            Update the title for this consultation.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
