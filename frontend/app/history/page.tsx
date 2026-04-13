"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Calendar,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatSession = {
  session_id: string;
  last_active: string;
  title?: string;
};

const ITEMS_PER_PAGE = 20;

export default function HistoryPage() {
  const router = useRouter();
  const { token, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionToEdit, setSessionToEdit] = useState<ChatSession | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: historyData, isLoading: isLoadingHistory } = useQuery<{
    sessions: ChatSession[];
    hasMore: boolean;
  }>({
    queryKey: ["sessions", "history", page],
    queryFn: async () => {
      const offset = page * ITEMS_PER_PAGE;
      const response = await api.get(
        `/sessions?limit=${ITEMS_PER_PAGE + 1}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const sessions = response.data.sessions;
      return {
        sessions: sessions.slice(0, ITEMS_PER_PAGE),
        hasMore: sessions.length > ITEMS_PER_PAGE,
      };
    },
    enabled: !!token,
  });

  const historySessions = historyData?.sessions;
  const hasMorePages = historyData?.hasMore ?? false;

  const filteredSessions = historySessions?.filter((s) =>
    (s.title || "New Consultation")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

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

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSessionToDelete(null);
    },
  });

  useEffect(() => {
    if (_hasHydrated && !token) {
      router.push("/login");
    }
  }, [_hasHydrated, token, router]);

  if (!_hasHydrated) return null;
  if (!token) return null;

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
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeSessionId={null}
        onSessionSelect={(id) => {
          sessionStorage.setItem("load_session", id);
          router.push("/chat");
        }}
        onNewChatClick={() => {
          sessionStorage.removeItem("load_session");
          router.push("/chat");
        }}
      />

      {/* Main History Content Area */}
      <main className="flex flex-1 flex-col relative min-w-0 bg-background overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 gap-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-0 font-bold">
            <Image
              src="/healthnav-logo.svg"
              alt="Logo"
              width={64}
              height={64}
              className="h-16 w-16 -ml-4 -mr-1 object-contain"
            />
            HealthNavigator
          </div>
        </header>

        {/* History Header */}
        <div className="px-6 py-3 bg-card/50 shrink-0 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">
            Consultation History
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            View and manage your past conversations
          </p>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search consultations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
              {isLoadingHistory ? (
                <div className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Loading your history...</p>
                </div>
              ) : historySessions?.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>No past consultations found.</p>
                  {page > 0 && (
                    <Button
                      variant="link"
                      onClick={() => setPage(0)}
                      className="mt-2"
                    >
                      Return to page 1
                    </Button>
                  )}
                </div>
              ) : filteredSessions?.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4 opacity-20" />
                  <p>No consultations match your search.</p>
                </div>
              ) : (
                <div className="divide-y divide-border flex-1">
                  {filteredSessions?.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => {
                        sessionStorage.setItem(
                          "load_session",
                          session.session_id,
                        );
                        router.push("/chat");
                      }}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start gap-4 overflow-hidden">
                        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate text-base">
                            {session.title || "New Consultation"}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.last_active).toLocaleDateString(
                              undefined,
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center pl-4 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls pinned to bottom of card */}
              {!isLoadingHistory && (hasMorePages || page > 0) && (
                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Page {page + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMorePages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}
