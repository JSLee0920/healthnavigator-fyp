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
          title={!isOpen ? "Account Settings" : undefined}
          className={`flex items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden ${isOpen ? "w-full gap-3 rounded-lg p-2 text-left hover:bg-accent" : "w-10 h-10 justify-center rounded-full hover:ring-2 hover:ring-primary/50"}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {initial}
          </div>
          {isOpen && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs md:text-sm font-bold text-foreground">
                  {username || email || "Patient User"}
                </span>
                <span className="text-[11px] md:text-xs text-muted-foreground truncate">
                  Account settings
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
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
