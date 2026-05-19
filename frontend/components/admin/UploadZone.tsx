"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  isPending: boolean;
}

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const XML_MAX_BYTES = 100 * 1024 * 1024;
const MEDLINEPLUS_XML_PATTERN = /^mplus_topics_.+\.xml$/i;
const MEDLINEPLUS_HINT = "mplus_topics_*.xml";

const FILE_PILLS = [".pdf", ".xml", MEDLINEPLUS_HINT];

const validateFile = (file: File): string | null => {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isAllowedXml = MEDLINEPLUS_XML_PATTERN.test(file.name);

  if (!isPdf && !isAllowedXml) {
    return `Only PDF files or MedlinePlus XML (${MEDLINEPLUS_HINT}) are supported.`;
  }
  if (isPdf && file.size > PDF_MAX_BYTES) return "PDF exceeds 20MB limit.";
  if (isAllowedXml && file.size > XML_MAX_BYTES)
    return "XML exceeds 100MB limit.";
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
      <div className="upload-loading-bg relative flex min-h-60 flex-1 flex-col items-center justify-center overflow-hidden rounded-[12px] border-[1.5px] border-sage p-9 text-center">
        <div className="upload-loading-glow flex h-16 w-16 items-center justify-center rounded-full border border-sage bg-paper text-forest-deep">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="mt-5 text-[14px] font-medium text-ink md:text-[15px]">
          Uploading {file?.name ?? "document"}…
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-mute md:text-[11px]">
          Watch the activity log for processing status
        </p>

        <div className="absolute inset-x-0 bottom-0 h-0.75 overflow-hidden bg-sage-soft">
          <div className="upload-loading-bar h-full w-1/4 bg-linear-to-r from-transparent via-forest-deep to-transparent" />
        </div>
      </div>
    );
  }

  const dropBg =
    "[background:repeating-linear-gradient(135deg,var(--paper)_0_14px,var(--cream-2)_14px_15px)]";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload document"
      className={`relative flex min-h-60 flex-1 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[12px] border-[1.5px] border-dashed p-7 transition-colors
        ${isDragging ? "border-forest-deep" : "border-sage"}
        ${file ? "border-solid border-forest-deep" : ""}
        ${dropBg}
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
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf,.xml,application/xml,text/xml"
        className="hidden"
        onChange={(e) => {
          handleSelected(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-sage bg-paper text-forest-deep shadow-[0_0_0_8px_var(--sage-soft)]">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-ink">{file.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-mute">
              {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for processing
            </p>
            {error && (
              <p
                className="mt-2 text-[12px] font-medium text-[oklch(0.55_0.13_28)]"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 gap-1.5 rounded-xl px-3 text-[12px] text-ink-soft hover:bg-cream-2 hover:text-ink"
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
              onChange(null);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Remove document
          </Button>
        </div>
      ) : (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-sage bg-paper text-forest-deep shadow-[0_0_0_8px_var(--sage-soft)]">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="text-center">
            <div className="text-[14px] font-medium text-ink md:text-[15px]">
              <span className="text-forest-deep underline underline-offset-[3px]">
                Click to select
              </span>{" "}
              or drag &amp; drop your file
            </div>
            <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-mute">
              PDF (max 20 MB) · MedlinePlus XML (max 100 MB)
            </div>
            {error && (
              <p
                className="mt-2 text-[12px] font-medium text-[oklch(0.55_0.13_28)]"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            {FILE_PILLS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-sage bg-paper px-2.5 py-0.75 font-mono text-[10px] tracking-[0.08em] text-forest-deep"
              >
                {p}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
