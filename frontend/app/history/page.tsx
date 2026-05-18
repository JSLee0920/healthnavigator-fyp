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
  const totalSessions = historyData?.total ?? 0;

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
    <div className="flex h-screen w-full overflow-hidden bg-cream text-ink">
      <Sidebar
        activeSessionId={null}
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-cream">
        <header className="flex shrink-0 flex-col gap-1 border-b border-rule bg-cream px-4 py-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-9 w-9 shrink-0 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="min-w-0 truncate text-[20px] font-semibold leading-tight tracking-tight text-ink md:text-[24px]">
              Consultation <span className="text-forest-deep">History</span>
            </h1>
          </div>
          <p className="truncate text-[13px] text-ink-soft md:ml-0">
            View and manage your past conversations.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="flex h-12 items-center gap-3 rounded-[12px] border border-rule bg-paper px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-mute" />
              <input
                placeholder="Search consultations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-mute"
              />
            </div>

            {!isLoadingHistory && (filteredSessions?.length ?? 0) > 0 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                  {filteredSessions?.length} of {totalSessions} session
                  {totalSessions === 1 ? "" : "s"}
                </span>
              </div>
            )}

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
                <Loader2 className="mb-4 h-8 w-8 animate-spin" />
                <p className="text-[13px]">Loading your history…</p>
              </div>
            ) : historySessions?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
                <MessageSquare className="mb-4 h-12 w-12 opacity-30" />
                <p className="text-[13px]">No past consultations found.</p>
                {page > 0 && (
                  <Button
                    variant="link"
                    onClick={() => setPage(0)}
                    className="mt-2 text-forest-deep"
                  >
                    Return to page 1
                  </Button>
                )}
              </div>
            ) : filteredSessions?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
                <Search className="mb-4 h-12 w-12 opacity-30" />
                <p className="text-[13px]">
                  No consultations match your search.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
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
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-rule bg-transparent text-ink hover:bg-cream-2"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMorePages}
                  className="border-rule bg-transparent text-ink hover:bg-cream-2"
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
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
