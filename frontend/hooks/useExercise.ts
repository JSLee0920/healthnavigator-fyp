import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
}

const QK = {
  logs: ["exercise", "logs"] as const,
  summary: ["exercise", "summary"] as const,
  goal: ["exercise", "goal"] as const,
};

export function useExerciseLogs(enabled: boolean) {
  return useQuery<ExerciseLog[]>({
    queryKey: QK.logs,
    queryFn: async () => {
      const response = await api.get("/exercise/logs?limit=200");
      return response.data;
    },
    enabled,
  });
}

export function useExerciseSummary(enabled: boolean) {
  return useQuery<ExerciseSummary>({
    queryKey: QK.summary,
    queryFn: async () => {
      const response = await api.get("/exercise/summary");
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
    onSuccess: () => invalidateAll(qc),
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
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exercise/logs/${id}`);
      return id;
    },
    onSuccess: () => invalidateAll(qc),
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
    onSuccess: () => invalidateAll(qc),
  });
}
