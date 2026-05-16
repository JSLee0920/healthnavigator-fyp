"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  MessageSquare,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
import { DeleteSessionDialog } from "@/components/sessions/DeleteSessionDialog";
import { EditTitleDialog } from "@/components/sessions/EditTitleDialog";
import { SessionHistoryRow } from "@/components/sessions/SessionHistoryRow";
import {
  useDeleteSession,
  useSessionHistory,
  useUpdateSessionTitle,
  type ChatSession,
} from "@/hooks/useSessions";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

const ITEMS_PER_PAGE = 20;

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { setSidebarOpen } = useUIStore();

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<ChatSession | null>(null);

  const { data: historyData, isLoading: isLoadingHistory } = useSessionHistory(
    page,
    ITEMS_PER_PAGE,
    !!isAuthenticated,
  );

  const historySessions = historyData?.sessions;
  const hasMorePages = historyData?.hasMore ?? false;

  const filteredSessions = historySessions?.filter((s) =>
    (s.title || "New Consultation")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const updateTitle = useUpdateSessionTitle(() => setSessionToEdit(null));
  const deleteSession = useDeleteSession(() => setSessionToDelete(null));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        activeSessionId={null}
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="flex flex-1 flex-col relative min-w-0 bg-background overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/50 px-4 py-3 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-semibold text-foreground truncate">
              Consultation History
            </h1>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 truncate">
              View and manage your past conversations
            </p>
          </div>
        </header>

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
                    <SessionHistoryRow
                      key={session.session_id}
                      session={session}
                      isDeletePending={deleteSession.isPending}
                      onOpen={(s) => router.push(`/chat/${s.session_id}`)}
                      onEdit={setSessionToEdit}
                      onDelete={setSessionToDelete}
                    />
                  ))}
                </div>
              )}

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

      <DeleteSessionDialog
        session={sessionToDelete}
        isPending={deleteSession.isPending}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={(s) => deleteSession.mutate(s.session_id)}
      />

      <EditTitleDialog
        session={sessionToEdit}
        isPending={updateTitle.isPending}
        onCancel={() => setSessionToEdit(null)}
        onSave={(s, title) => updateTitle.mutate({ id: s.session_id, title })}
      />
    </div>
  );
}
