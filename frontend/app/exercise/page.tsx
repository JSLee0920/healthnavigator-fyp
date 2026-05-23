"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/exercise/GoalCard";
import { HistoryTable } from "@/components/exercise/HistoryTable";
import { LogForm } from "@/components/exercise/LogForm";
import { WeeklyChart } from "@/components/exercise/WeeklyChart";
import { WeeklyHistory } from "@/components/exercise/WeeklyHistory";
import {
  useExerciseLogs,
  useExerciseSummary,
  useRecentLogs,
} from "@/hooks/useExercise";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export default function ExercisePage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { setSidebarOpen } = useUIStore();

  const [page, setPage] = useState(0);

  const summary = useExerciseSummary(!!isAuthenticated);
  const pagedLogs = useExerciseLogs(page, !!isAuthenticated);
  const recentLogs = useRecentLogs(!!isAuthenticated);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream text-primary">
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
            <h1 className="min-w-0 truncate text-[20px] font-semibold leading-tight tracking-tight text-primary md:text-[24px]">
              Exercise <span className="text-forest-deep">Tracker</span>
            </h1>
          </div>
          <p className="truncate text-[13px] text-ink-soft">
            Log activity, hit your weekly goal, and watch the trend.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <GoalCard summary={summary.data} isLoading={summary.isLoading} />

            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              <LogForm />
              <WeeklyChart logs={recentLogs.data} />
            </div>

            <WeeklyHistory enabled={!!isAuthenticated} />

            <div>
              <h2 className="mb-3 text-[15px] font-semibold text-primary">
                Exercise Log
              </h2>
              <HistoryTable
                logs={pagedLogs.data?.logs}
                isLoading={pagedLogs.isLoading}
                page={page}
                total={pagedLogs.data?.total ?? 0}
                hasMore={pagedLogs.data?.hasMore ?? false}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
