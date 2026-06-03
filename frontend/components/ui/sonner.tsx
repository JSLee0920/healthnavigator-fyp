"use client"

import { Toaster as Sonner } from "sonner"

function Toaster({ ...props }: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      data-slot="toaster"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
