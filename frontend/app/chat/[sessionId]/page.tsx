"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { streamChat } from "@/lib/streamChat";
import { createWordStreamer } from "@/lib/wordStreamer";
import Sidebar from "@/components/Sidebar";
import { Chat } from "@/components/chat/Chat";

type Message = { role: "user" | "ai"; content: string };
type SessionData = {
  title: string;
  messages: { role: string; content: string }[];
};

export default function ExistingChatPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const sessionId = params.sessionId as string;
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated, router]);

  const { data: sessionData, isPending: isLoadingSession } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/messages`);
      return response.data;
    },
    enabled: !!sessionId && !!isAuthenticated,
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      let aiContent = "";

      const upsertAi = (content: string) =>
        queryClient.setQueryData(
          ["session", sessionId],
          (old: SessionData | undefined) => {
            const messages = [...(old?.messages ?? [])];
            const last = messages[messages.length - 1];
            if (last && last.role === "ai") {
              messages[messages.length - 1] = { role: "ai", content };
            } else {
              messages.push({ role: "ai", content });
            }
            return { ...old, messages };
          },
        );

      const streamer = createWordStreamer(upsertAi);

      await streamChat(
        { message: userMessage, session_id: sessionId },
        (event) => {
          if (event.type === "token") {
            aiContent += event.content;
            streamer.push(event.content);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        },
      );

      await streamer.finish();
      upsertAi(aiContent);
    },
    onMutate: (userMessage) => {
      queryClient.setQueryData(
        ["session", sessionId],
        (old: SessionData | undefined) => ({
          ...old,
          messages: [
            ...(old?.messages ?? []),
            { role: "user", content: userMessage },
          ],
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: () => {
      queryClient.setQueryData(
        ["session", sessionId],
        (old: SessionData | undefined) => {
          const messages = [...(old?.messages ?? [])];
          const last = messages[messages.length - 1];
          if (last && last.role === "ai") {
            messages[messages.length - 1] = {
              role: "ai",
              content: "Sorry, an error occurred.",
            };
          } else {
            messages.push({ role: "ai", content: "Sorry, an error occurred." });
          }
          return { ...old, messages };
        },
      );
    },
  });

  const messages = useMemo<Message[]>(
    () =>
      (sessionData?.messages ?? []).map(
        (m: SessionData["messages"][number]) => ({
          role: m.role === "user" ? "user" : "ai",
          content: m.content,
        }),
      ),
    [sessionData?.messages],
  );

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <Chat
      messages={messages}
      isPending={chatMutation.isPending}
      isLoadingSession={isLoadingSession}
      sessionTitle={sessionData?.title}
      onSubmitMessage={(text) => chatMutation.mutate(text)}
    >
      <Sidebar
        activeSessionId={sessionId}
        isLoadingSessionId={isLoadingSession ? sessionId : null}
        onSessionSelect={(id) => {
          if (id !== sessionId) router.push(`/chat/${id}`);
        }}
        onNewChatClick={() => router.push("/chat")}
        onSessionDelete={(id) => {
          if (sessionId === id) router.push("/chat");
        }}
      />
      <Chat.Main>
        <Chat.Header />
        <Chat.MessageList />
        <Chat.InputArea />
      </Chat.Main>
    </Chat>
  );
}
