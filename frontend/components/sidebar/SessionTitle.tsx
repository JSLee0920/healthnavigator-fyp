"use client";

import { useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SessionTitleProps {
  title: string;
  isSelected: boolean;
}

export function SessionTitle({ title, isSelected }: SessionTitleProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = () => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  };

  const content = (
    <span
      ref={textRef}
      onMouseEnter={checkTruncation}
      className={`truncate text-xs md:text-sm font-medium block ${isSelected ? "" : "text-muted-foreground group-hover:text-foreground"}`}
    >
      {title || "New Consultation"}
    </span>
  );

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p>{title || "New Consultation"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
