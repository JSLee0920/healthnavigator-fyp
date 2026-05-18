"use client";

import Link from "next/link";
import { ChevronUp, LogOut, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  isOpen: boolean;
  username?: string;
  email?: string;
  onNavigate: () => void;
  onLogout: () => void;
}

export function UserMenu({
  isOpen,
  username,
  email,
  onNavigate,
  onLogout,
}: UserMenuProps) {
  const initial = (username?.[0] || email?.[0] || "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account settings"
          title={!isOpen ? "Account Settings" : undefined}
          className={`flex items-center overflow-hidden outline-none transition-colors focus-visible:ring-2 focus-visible:ring-forest ${isOpen ? "w-full gap-3 rounded-[10px] p-2 text-left hover:bg-cream" : "h-10 w-10 justify-center rounded-full hover:ring-2 hover:ring-forest/40"}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-cream font-serif text-[15px] italic">
            {initial}
          </div>
          {isOpen && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-[13px] font-medium text-ink">
                  {username || email || "Patient User"}
                </span>
                <span className="truncate text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                  Account · Settings
                </span>
              </div>
              <ChevronUp className="h-4 w-4 shrink-0 text-ink-mute" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="mb-2 w-64 border border-rule bg-cream p-1.5 shadow-md ring-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
          My Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-rule" />
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-ink focus:bg-sage-soft focus:text-forest-deep"
        >
          <Link
            href="/profile"
            onClick={onNavigate}
            className="flex items-center gap-2 leading-none"
          >
            <User className="h-4 w-4 shrink-0 text-ink-mute group-focus/dropdown-menu-item:text-forest-deep" />
            <span>Health Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-rule" />
        <DropdownMenuItem
          variant="destructive"
          onClick={onLogout}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] leading-none"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
