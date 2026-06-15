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
  const [prevSessionId, setPrevSessionId] = useState(
    session?.session_id ?? null,
  );
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
      <DialogContent className="border-rule bg-paper">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold leading-tight tracking-tight text-ink">
            Edit consultation title
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-ink-soft">
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
          className="border-0 border-b border-rule rounded-none px-0 text-[16px] focus-visible:border-forest-deep focus-visible:ring-0 shadow-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
