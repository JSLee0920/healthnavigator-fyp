"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";

interface AdminNavProps {
  isOpen: boolean;
  onNavigate: () => void;
}

const items = [
  { href: "/admin", label: "Admin Console", Icon: ShieldCheck },
  { href: "/admin/documents", label: "Documents", Icon: FileText },
];

export function AdminNav({ isOpen, onNavigate }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map(({ href, label, Icon }, i) => {
        const isActive = pathname === href;
        const isLast = i === items.length - 1;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={!isOpen ? label : undefined}
            aria-label={label}
            className={`flex items-center rounded-md font-medium transition-colors whitespace-nowrap overflow-hidden shrink-0
              ${isOpen ? "w-full gap-2 p-2 text-sm" : "h-10 w-10 justify-center"}
              ${isLast ? "mb-6" : ""}
              ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }
            `}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {isOpen && <span>{label}</span>}
          </Link>
        );
      })}
    </>
  );
}
