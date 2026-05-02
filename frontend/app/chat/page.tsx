"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
      const response = await api.post("/chat/stream", {
        message: userMessage,
        session_id: null,
      });
      return { ...response.data, userMessage };
    },
    onSuccess: (data) => {
      const aiReply = data.reply || "Unexpected response format";
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      if (data.session) {
        queryClient.setQueryData(["session", data.session], {
          title: "New Consultation",
          messages: [
            { role: "user", content: data.userMessage },
            { role: "ai", content: aiReply },
          ],
        });
        setIsNavigating(true);
        router.push(`/chat/${data.session}`);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sorry, an error occurred." },
      ]);
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
