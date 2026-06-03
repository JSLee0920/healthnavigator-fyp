"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { streamChat } from "@/lib/streamChat";
import { createWordStreamer } from "@/lib/wordStreamer";
import Sidebar from "@/components/Sidebar";
import { Chat } from "@/components/chat/Chat";

type Message = { role: "user" | "ai"; content: string };

export default function NewChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [hasStarted, setHasStarted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated, router]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      let session: string | null = null;
      let title = "New Consultation";
      let aiContent = "";

      const upsertAi = (content: string) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "ai") {
            next[next.length - 1] = { role: "ai", content };
          } else {
            next.push({ role: "ai", content });
          }
          return next;
        });

      const streamer = createWordStreamer(upsertAi);

      await streamChat({ message: userMessage, session_id: null }, (event) => {
        if (event.type === "meta") {
          session = event.session;
          title = event.title;
        } else if (event.type === "token") {
          aiContent += event.content;
          streamer.push(event.content);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });

      await streamer.finish();
      upsertAi(aiContent);

      return { session, title, userMessage, aiContent };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      if (data.session) {
        queryClient.setQueryData(["session", data.session], {
          title: data.title,
          messages: [
            { role: "user", content: data.userMessage },
            { role: "ai", content: data.aiContent },
          ],
        });
        setIsNavigating(true);
        router.push(`/chat/${data.session}`);
      }
    },
    onError: () => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai") {
          next[next.length - 1] = {
            role: "ai",
            content: "Sorry, an error occurred.",
          };
        } else {
          next.push({ role: "ai", content: "Sorry, an error occurred." });
        }
        return next;
      });
    },
  });

  const handleSendMessage = (text: string) => {
    setHasStarted(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    chatMutation.mutate(text);
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <Chat
      messages={messages}
      isPending={chatMutation.isPending}
      showWelcome={!hasStarted}
      inputDisabled={isNavigating}
      onSubmitMessage={handleSendMessage}
    >
      <Sidebar
        activeSessionId={null}
        isLoadingSessionId={null}
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => {}}
        onSessionDelete={() => {}}
      />
      <Chat.Main>
        <Chat.Header />
        <Chat.MessageList />
        <Chat.InputArea />
      </Chat.Main>
    </Chat>
  );
}
