"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  History,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/sidebar/AdminNav";
import { SessionItem } from "@/components/sidebar/SessionItem";
import { UserMenu } from "@/components/sidebar/UserMenu";
import { DeleteSessionDialog } from "@/components/sessions/DeleteSessionDialog";
import { EditTitleDialog } from "@/components/sessions/EditTitleDialog";
import {
  useDeleteSession,
  useSidebarSessions,
  useUpdateSessionTitle,
  type ChatSession,
} from "@/hooks/useSessions";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

interface SidebarProps {
  activeSessionId?: string | null;
  isLoadingSessionId?: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChatClick: () => void;
  onSessionDelete?: (sessionId: string) => void;
}

export default function Sidebar({
  activeSessionId,
  isLoadingSessionId,
  onSessionSelect,
  onNewChatClick,
  onSessionDelete,
}: SidebarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );
  const [sessionToEdit, setSessionToEdit] = useState<ChatSession | null>(null);

  const { data: sessions, isLoading } = useSidebarSessions(!!isAuthenticated);
  const updateTitle = useUpdateSessionTitle(() => setSessionToEdit(null));
  const deleteSession = useDeleteSession((deletedId) => {
    onSessionDelete?.(deletedId);
    setSessionToDelete(null);
  });

  const closeOnMobile = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
    closeOnMobile();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Overlay Background */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-rule bg-cream-2 transition-all duration-300 ease-in-out md:static
          ${isSidebarOpen ? "w-64 translate-x-0 md:w-72" : "-translate-x-full overflow-hidden md:w-16 md:translate-x-0"}
        `}
      >
        <div
          className={`flex h-16 shrink-0 items-center ${isSidebarOpen ? "justify-between px-4" : "justify-center"}`}
        >
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-1 whitespace-nowrap text-[17px] font-semibold tracking-tight text-primary">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator Logo"
                  width={64}
                  height={64}
                  className="-ml-3 -mr-3 h-12 w-12 object-contain md:-ml-4 md:-mr-5 md:h-16 md:w-16"
                />
                HealthNavigator
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden shrink-0 md:flex"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="h-5 w-5 text-ink-mute" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarOpen(true)}
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5 text-ink-mute" />
            </Button>
          )}
        </div>

        <div
          className={`flex-1 space-y-1 overflow-y-auto ${isSidebarOpen ? "p-4" : "flex flex-col items-center p-2 py-4"}`}
        >
          <button
            onClick={() => {
              onNewChatClick();
              closeOnMobile();
            }}
            title={!isSidebarOpen ? "New Consultation" : undefined}
            className={`mb-2 flex shrink-0 items-center overflow-hidden whitespace-nowrap rounded-[10px] bg-forest-deep font-medium text-cream transition-colors hover:bg-forest
              ${isSidebarOpen ? "h-10 w-full justify-between px-3.5 text-[13px]" : "h-10 w-10 justify-center"}
            `}
          >
            {isSidebarOpen ? (
              <>
                <span>New Consultation</span>
                <span className="font-serif text-[18px] italic leading-none">
                  +
                </span>
              </>
            ) : (
              <Plus className="h-4 w-4 shrink-0" />
            )}
          </button>

          <Link
            href="/history"
            onClick={closeOnMobile}
            title={!isSidebarOpen ? "Chat History" : undefined}
            className={`mb-6 flex shrink-0 items-center overflow-hidden whitespace-nowrap rounded-[10px] border border-rule bg-transparent font-medium text-ink transition-colors hover:bg-cream
              ${isSidebarOpen ? "h-10 w-full justify-between px-3.5 text-[13px]" : "h-10 w-10 justify-center"}
            `}
          >
            {isSidebarOpen ? (
              <>
                <span>Chat History</span>
                <span className="font-serif text-[16px] italic leading-none text-forest-deep">
                  →
                </span>
              </>
            ) : (
              <History className="h-4 w-4 shrink-0" />
            )}
          </Link>

          {user?.role === "admin" && (
            <AdminNav isOpen={isSidebarOpen} onNavigate={closeOnMobile} />
          )}

          {isSidebarOpen && (
            <>
              <div className="mb-2 whitespace-nowrap px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                Recent Consultations
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-ink-mute" />
                </div>
              ) : sessions?.length === 0 ? (
                <div className="whitespace-nowrap px-2 text-sm text-ink-mute">
                  No previous sessions.
                </div>
              ) : (
                sessions?.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isSelected={activeSessionId === session.session_id}
                    isLoading={isLoadingSessionId === session.session_id}
                    isDeletePending={
                      deleteSession.isPending &&
                      sessionToDelete?.session_id === session.session_id
                    }
                    onSelect={(s) => {
                      onSessionSelect(s.session_id);
                      closeOnMobile();
                    }}
                    onEdit={setSessionToEdit}
                    onDelete={setSessionToDelete}
                  />
                ))
              )}
            </>
          )}

        </div>

        <div
          className={`shrink-0 border-t border-rule ${isSidebarOpen ? "p-2" : "flex justify-center p-2"}`}
        >
          <UserMenu
            isOpen={isSidebarOpen}
            username={user?.username}
            email={user?.email}
            onNavigate={closeOnMobile}
            onLogout={handleLogout}
          />
        </div>
      </aside>

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
    </>
  );
}
