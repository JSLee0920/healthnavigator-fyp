export type ChatStreamEvent =
  | { type: "meta"; session: string; title: string; is_new: boolean }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function streamChat(
  body: { message: string; session_id: string | null },
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.replace(/^data: /, "").trim();
      if (!line) continue;
      onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }
}
