export type ChatRole = "user" | "ai";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export function upsertAssistant(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  const next = [...messages];
  const last = next[next.length - 1];
  if (last && last.role === "ai") {
    next[next.length - 1] = { role: "ai", content };
  } else {
    next.push({ role: "ai", content });
  }
  return next;
}
