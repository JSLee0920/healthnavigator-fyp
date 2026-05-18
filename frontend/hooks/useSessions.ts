import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ChatSession = {
  session_id: string;
  last_active: string;
  title?: string;
};

export interface SessionsListPage {
  sessions: ChatSession[];
  hasMore: boolean;
  total: number;
}

export function useSidebarSessions(enabled: boolean) {
  return useQuery<ChatSession[]>({
    queryKey: ["sessions", "sidebar"],
    queryFn: async () => {
      const response = await api.get("/sessions?limit=8");
      return response.data.sessions;
    },
    enabled,
  });
}

export function useSessionHistory(page: number, pageSize: number, enabled: boolean) {
  return useQuery<SessionsListPage>({
    queryKey: ["sessions", "history", page, pageSize],
    queryFn: async () => {
      const offset = page * pageSize;
      const response = await api.get(
        `/sessions?limit=${pageSize + 1}&offset=${offset}`,
      );
      const sessions: ChatSession[] = response.data.sessions;
      return {
        sessions: sessions.slice(0, pageSize),
        hasMore: sessions.length > pageSize,
        total: response.data.total ?? 0,
      };
    },
    enabled,
  });
}

export function useUpdateSessionTitle(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await api.patch(`/sessions/${id}`, { title });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onSuccess?.();
    },
  });
}

export function useDeleteSession(onSuccess?: (deletedId: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onSuccess?.(deletedId);
    },
  });
}
