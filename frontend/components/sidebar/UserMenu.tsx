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
        className="w-64 mb-2"
        align="start"
        side="top"
        sideOffset={8}
      >
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/profile"
            onClick={onNavigate}
            className="flex items-center"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Health Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
