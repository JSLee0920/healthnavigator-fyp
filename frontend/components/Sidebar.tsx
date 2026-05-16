"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
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
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-muted/40 transition-all duration-300 ease-in-out md:static
          ${isSidebarOpen ? "w-64 md:w-72 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16 overflow-hidden"}
        `}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border ${isSidebarOpen ? "justify-between px-4" : "justify-center"}`}
        >
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2 font-bold text-base md:text-lg whitespace-nowrap">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator Logo"
                  width={64}
                  height={64}
                  className="h-12 w-12 md:h-16 md:w-16 -ml-3 -mr-3 md:-ml-4 md:-mr-5 object-contain"
                />
                HealthNavigator
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex shrink-0"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
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
              <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div
          className={`flex-1 overflow-y-auto space-y-1 ${isSidebarOpen ? "p-4" : "p-2 py-4 flex flex-col items-center"}`}
        >
          <button
            onClick={() => {
              onNewChatClick();
              closeOnMobile();
            }}
            title={!isSidebarOpen ? "New Consultation" : undefined}
            className={`flex items-center rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors mb-6 whitespace-nowrap overflow-hidden shrink-0
              ${isSidebarOpen ? "w-full gap-2 p-2 text-sm" : "w-10 h-10 justify-center"}
            `}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>New Consultation</span>}
          </button>

          {user?.role === "admin" && (
            <AdminNav isOpen={isSidebarOpen} onNavigate={closeOnMobile} />
          )}

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
                sessions?.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isSelected={activeSessionId === session.session_id}
                    isLoading={isLoadingSessionId === session.session_id}
                    isDeletePending={deleteSession.isPending}
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

          {isSidebarOpen &&
            sessions &&
            sessions.length >= 10 &&
            pathname !== "/history" && (
              <Link
                href="/history"
                onClick={closeOnMobile}
                className="flex w-full items-center justify-center p-2 mt-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
              >
                View all history &rarr;
              </Link>
            )}
        </div>

        <div
          className={`border-t border-border shrink-0 ${isSidebarOpen ? "p-2" : "p-2 flex justify-center"}`}
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
        onSave={(s, title) =>
          updateTitle.mutate({ id: s.session_id, title })
        }
      />
    </>
  );
}
