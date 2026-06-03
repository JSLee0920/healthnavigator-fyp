import { streamChat } from "@/lib/streamChat";
import { createWordStreamer } from "@/lib/wordStreamer";

interface ChatTurnHandlers {
  onMeta?: (meta: { session: string; title: string; is_new: boolean }) => void;
  onText: (fullText: string) => void;
}

export async function runChatTurn(
  body: { message: string; session_id: string | null },
  handlers: ChatTurnHandlers,
): Promise<string> {
  let aiContent = "";
  const streamer = createWordStreamer(handlers.onText);

  await streamChat(body, (event) => {
    if (event.type === "meta") {
      handlers.onMeta?.(event);
    } else if (event.type === "token") {
      aiContent += event.content;
      streamer.push(event.content);
    } else if (event.type === "error") {
      throw new Error(event.message);
    }
  });

  await streamer.finish();
  handlers.onText(aiContent);
  return aiContent;
}
