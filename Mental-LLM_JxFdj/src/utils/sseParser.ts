export const SSE_DONE_TOKEN = "[DONE]";

export interface SseDataEvent {
  data: string;
}

export interface SseParseResult {
  events: SseDataEvent[];
  buffer: string;
}

export function parseSseChunk(chunk: string, existingBuffer = ""): SseParseResult {
  const combined = (existingBuffer + chunk).replace(/\r\n/g, "\n");
  const lines = combined.split("\n");
  const buffer = lines.pop() ?? "";
  const events: SseDataEvent[] = [];

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    events.push({ data: line.slice(5).trim() });
  }

  return { events, buffer };
}

export function isSseDoneData(data: string): boolean {
  return data === SSE_DONE_TOKEN;
}
