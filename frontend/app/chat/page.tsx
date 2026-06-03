"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runChatTurn } from "@/lib/chatTurn";
import { upsertAssistant, type ChatMessage } from "@/types/chat";
import Sidebar from "@/components/Sidebar";
import { Chat } from "@/components/chat/Chat";

export default function NewChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [hasStarted, setHasStarted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated, router]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      let session: string | null = null;
      let title = "New Consultation";

      const aiContent = await runChatTurn(
        { message: userMessage, session_id: null },
        {
          onMeta: (meta) => {
            session = meta.session;
            title = meta.title;
          },
          onText: (text) => setMessages((prev) => upsertAssistant(prev, text)),
        },
      );

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
    onError: () =>
      setMessages((prev) => upsertAssistant(prev, "Sorry, an error occurred.")),
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
