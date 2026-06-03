import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

export type Intensity = "low" | "medium" | "high";

export interface ExerciseLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  intensity: Intensity;
  calories: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

export interface ExerciseLogInput {
  activity_type: string;
  duration_minutes: number;
  intensity: Intensity;
  calories?: number | null;
  notes?: string | null;
  logged_at?: string;
}

export interface ExerciseGoal {
  weekly_target_minutes: number;
  updated_at: string;
}

export interface ExerciseSummary {
  this_week_minutes: number;
  weekly_target_minutes: number;
  weekly_progress_pct: number;
  total_logs: number;
  current_streak_weeks: number;
}

export interface WeeklyBucket {
  week_start: string;
  week_end: string;
  minutes: number;
  met: boolean;
}

export interface WeeklyHistory {
  weeks: WeeklyBucket[];
  weekly_target_minutes: number;
}

export interface ExerciseLogsPage {
  logs: ExerciseLog[];
  total: number;
  hasMore: boolean;
}

const QK = {
  logs: ["exercise", "logs"] as const,
  summary: ["exercise", "summary"] as const,
  goal: ["exercise", "goal"] as const,
  weeklyHistory: ["exercise", "weekly-history"] as const,
};

export const LOGS_PAGE_SIZE = 20;
export const WEEKLY_HISTORY_WEEKS = 8;

export function startOfWeekLocal(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMon = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMon);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Paginated logs for the history table. Page is zero-indexed.
 */
export function useExerciseLogs(page: number, enabled: boolean) {
  return useQuery<ExerciseLogsPage>({
    queryKey: [...QK.logs, "page", page],
    queryFn: async () => {
      const offset = page * LOGS_PAGE_SIZE;
      const response = await api.get(
        `/exercise/logs?limit=${LOGS_PAGE_SIZE}&offset=${offset}`,
      );
      const total = response.data.total ?? 0;
      const logs = response.data.logs ?? [];
      return {
        logs,
        total,
        hasMore: offset + logs.length < total,
      };
    },
    enabled,
  });
}

/**
 * Wide list for the weekly chart — pulls many logs (no pagination) so we can
 * client-side bucket by day.
 */
export function useRecentLogs(enabled: boolean) {
  return useQuery<ExerciseLog[]>({
    queryKey: [...QK.logs, "recent"],
    queryFn: async () => {
      const response = await api.get("/exercise/logs?limit=200&offset=0");
      return response.data.logs ?? [];
    },
    enabled,
  });
}

export function useWeeklyHistory(enabled: boolean) {
  return useQuery<WeeklyHistory>({
    queryKey: QK.weeklyHistory,
    queryFn: async () => {
      const weekStart = startOfWeekLocal().toISOString();
      const response = await api.get(
        `/exercise/weekly-history?weeks=${WEEKLY_HISTORY_WEEKS}&week_start=${encodeURIComponent(weekStart)}`,
      );
      return response.data;
    },
    enabled,
  });
}

export function useExerciseSummary(enabled: boolean) {
  return useQuery<ExerciseSummary>({
    queryKey: QK.summary,
    queryFn: async () => {
      const weekStart = startOfWeekLocal().toISOString();
      const response = await api.get(
        `/exercise/summary?week_start=${encodeURIComponent(weekStart)}`,
      );
      return response.data;
    },
    enabled,
  });
}

export function useExerciseGoal(enabled: boolean) {
  return useQuery<ExerciseGoal>({
    queryKey: QK.goal,
    queryFn: async () => {
      const response = await api.get("/exercise/goal");
      return response.data;
    },
    enabled,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["exercise"] });
}

export function useCreateLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExerciseLogInput) => {
      const response = await api.post("/exercise/logs", data);
      return response.data as ExerciseLog;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Exercise Logged");
    },
    onError: () => toast.error("Could Not Save Log. Try Again."),
  });
}

export function useUpdateLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ExerciseLogInput>;
    }) => {
      const response = await api.patch(`/exercise/logs/${id}`, data);
      return response.data as ExerciseLog;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Log Updated");
    },
    onError: () => toast.error("Could Not Update Log. Try Again."),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exercise/logs/${id}`);
      return id;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Log Deleted");
    },
    onError: () => toast.error("Could Not Delete Log. Try Again."),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekly_target_minutes: number) => {
      const response = await api.put("/exercise/goal", {
        weekly_target_minutes,
      });
      return response.data as ExerciseGoal;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Goal Updated");
    },
    onError: () => toast.error("Could Not Update Goal. Try Again."),
  });
}
