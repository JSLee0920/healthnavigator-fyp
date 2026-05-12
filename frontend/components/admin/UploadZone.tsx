"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  isPending: boolean;
}

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const validateFile = (file: File): string | null => {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are supported.";
  if (file.size > MAX_SIZE_BYTES) return "File exceeds 20MB limit.";
  return null;
};

export function UploadZone({ file, onChange, isPending }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelected = (selected: File | undefined) => {
    if (!selected) return;
    const err = validateFile(selected);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onChange(selected);
  };

  const openPicker = () => inputRef.current?.click();

  if (isPending) {
    return (
      <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-solid border-primary bg-primary/5 p-10 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium text-foreground">
          Uploading {file?.name ?? "document"}…
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch the activity log for processing status.
        </p>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload document"
      className={`flex min-h-[300px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors
        ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"}
        ${file ? "border-solid border-primary bg-primary/5" : ""}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleSelected(e.dataTransfer.files?.[0]);
      }}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          handleSelected(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />

      {file ? (
        <div className="flex flex-col items-center space-y-4 text-center">
          <FileText className="h-16 w-16 text-primary" />
          <div>
            <p className="text-lg font-medium text-foreground">{file.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
            </p>
            {error && (
              <p
                className="mt-2 text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <Button
            variant="link"
            type="button"
            className="mt-2 h-auto p-0 text-sm text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
              onChange(null);
            }}
          >
            Remove Document
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4 text-center text-muted-foreground">
          <div
            className={`rounded-full bg-background p-4 shadow-sm ${isDragging ? "animate-bounce text-primary" : ""}`}
          >
            <UploadCloud className="h-10 w-10" />
          </div>
          <div>
            <p className="text-lg">
              <span className="font-semibold text-primary">
                Click to select
              </span>{" "}
              or drag and drop
            </p>
            <p className="mt-1 text-sm">Supported format: PDF (Max 20MB)</p>
            {error && (
              <p
                className="mt-2 text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
