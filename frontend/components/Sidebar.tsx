"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  MessageSquare,
  Trash2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ChevronUp,
  LogOut,
  MoreHorizontal,
  Pencil,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChatSession = {
  session_id: string;
  last_active: string;
  title?: string;
};

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeSessionId?: string | null;
  isLoadingSessionId?: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChatClick: () => void;
  onSessionDelete?: (sessionId: string) => void;
}

function SessionTitle({
  title,
  isSelected,
}: {
  title: string;
  isSelected: boolean;
}) {
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
      className={`truncate text-sm font-medium block ${isSelected ? "" : "text-muted-foreground group-hover:text-foreground"}`}
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

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeSessionId,
  isLoadingSessionId,
  onSessionSelect,
  onNewChatClick,
  onSessionDelete,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );
  const [sessionToEdit, setSessionToEdit] = useState<ChatSession | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await api.patch(
        `/sessions/${id}`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSessionToEdit(null);
    },
  });

  const { data: sessions, isLoading } = useQuery<ChatSession[]>({
    queryKey: ["sessions", "sidebar"],
    queryFn: async () => {
      const response = await api.get("/sessions?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.sessions;
    },
    enabled: !!token,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (onSessionDelete) onSessionDelete(deletedId);
      setSessionToDelete(null);
    },
  });

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const openEditDialog = (session: ChatSession) => {
    setSessionToEdit(session);
    setEditTitle(session.title || "");
  };

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && sessionToEdit) {
      updateTitleMutation.mutate({
        id: sessionToEdit.session_id,
        title: trimmed,
      });
    }
  };

  return (
    <>
      {/* Mobile Overlay Background */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* The Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-muted/40 transition-all duration-300 ease-in-out md:static 
          ${isSidebarOpen ? "w-72 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16 overflow-hidden"}
        `}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border ${isSidebarOpen ? "justify-between px-4" : "justify-center"}`}
        >
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2 font-bold text-lg whitespace-nowrap">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 -ml-4 -mr-5 object-contain"
                />
                HealthNavigator
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex shrink-0"
                onClick={() => setIsSidebarOpen(false)}
              >
                <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setIsSidebarOpen(true)}
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div
          className={`flex-1 overflow-y-auto space-y-1 ${isSidebarOpen ? "p-4" : "p-2 py-4 flex flex-col items-center"}`}
        >
          <button
            onClick={onNewChatClick}
            title={!isSidebarOpen ? "New Consultation" : undefined}
            className={`flex items-center rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors mb-6 whitespace-nowrap overflow-hidden shrink-0
              ${isSidebarOpen ? "w-full gap-2 p-2 text-sm" : "w-10 h-10 justify-center"}
            `}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>New Consultation</span>}
          </button>

          {isSidebarOpen && (
            <>
              <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">
                Recent Consultations
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : sessions?.length === 0 ? (
                <div className="px-2 text-sm text-muted-foreground/70 whitespace-nowrap">
                  No previous sessions.
                </div>
              ) : (
                sessions?.map((session) => {
                  const isSelected = activeSessionId === session.session_id;

                  return (
                    <div
                      key={session.session_id}
                      className={`group flex items-center transition-all w-full gap-1 rounded-xl pr-1 ${isSelected ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border" : "hover:bg-accent/50"}`}
                    >
                      <button
                        onClick={() => onSessionSelect(session.session_id)}
                        className="flex items-center text-left overflow-hidden min-w-0 flex-1 gap-3 p-3"
                      >
                        {isLoadingSessionId === session.session_id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : (
                          <MessageSquare
                            className={`h-4 w-4 shrink-0 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                          />
                        )}
                        <div className="flex flex-1 flex-col overflow-hidden justify-center">
                          <SessionTitle
                            title={session.title || ""}
                            isSelected={isSelected}
                          />
                        </div>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted rounded-lg group-hover:opacity-100 md:focus:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(session)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Title
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={deleteSessionMutation.isPending}
                            onClick={() => setSessionToDelete(session)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              )}
            </>
          )}

          {isSidebarOpen &&
            sessions &&
            sessions.length >= 10 &&
            pathname !== "/history" && (
              <Link
                href="/history"
                className="flex w-full items-center justify-center p-2 mt-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
              >
                View all history &rarr;
              </Link>
            )}
        </div>

        <div
          className={`border-t border-border shrink-0 ${isSidebarOpen ? "p-2" : "p-2 flex justify-center"}`}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title={!isSidebarOpen ? "Account Settings" : undefined}
                className={`flex items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden ${isSidebarOpen ? "w-full gap-3 rounded-lg p-2 text-left hover:bg-accent" : "w-10 h-10 justify-center rounded-full hover:ring-2 hover:ring-primary/50"}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {user?.username?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
                {isSidebarOpen && (
                  <>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-bold text-foreground">
                        {user?.username || user?.email || "Patient User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
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
              align={isSidebarOpen ? "start" : "end"}
              side="right"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Health Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Consultation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {sessionToDelete?.title || "New Consultation"}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (sessionToDelete) {
                  deleteSessionMutation.mutate(sessionToDelete.session_id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!sessionToEdit}
        onOpenChange={(open) => {
          if (!open) setSessionToEdit(null);
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
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") setSessionToEdit(null);
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveTitle}
              disabled={updateTitleMutation.isPending || !editTitle.trim()}
            >
              {updateTitleMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
