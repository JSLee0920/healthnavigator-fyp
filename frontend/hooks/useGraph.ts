import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type GraphNodeType =
  | "Symptom"
  | "MedicalCondition"
  | "Medication"
  | "BodyPart"
  | "Topic"
  | "UserEntity"
  | "Allergy"
  | "Unknown";

export type GraphOrigin = "user" | "related" | "search";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType | string;
  origin: GraphOrigin;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useUserGraph(enabled: boolean) {
  return useQuery<GraphResponse>({
    queryKey: ["graph", "me"],
    queryFn: async () => {
      const response = await api.get("/graph/me");
      return response.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useSearchGraph(term: string, enabled: boolean) {
  return useQuery<GraphResponse>({
    queryKey: ["graph", "search", term],
    queryFn: async () => {
      const response = await api.get(
        `/graph/search?q=${encodeURIComponent(term)}`,
      );
      return response.data;
    },
    enabled: enabled && term.trim().length > 0,
    retry: false,
  });
}
