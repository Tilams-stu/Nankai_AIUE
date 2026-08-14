import type { ChatRequest, ChatService, ChatStreamEvent } from "../contracts/chatContract.js";
import { hasVisibleText } from "../utils/sanitizeText.js";
import { isSseDoneData, parseSseChunk } from "../utils/sseParser.js";

async function readProxyError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") return data.error;
    if (data && typeof data.message === "string") return data.message;
  } catch {}
  return "Service temporarily unavailable.";
}

async function readProxyErrorCode(response: Response): Promise<string | undefined> {
  try {
    const clone = response.clone();
    const data = await clone.json();
    if (data && typeof data.code === "string") return data.code;
  } catch {}
  return undefined;
}

export function createChatService(fetchImpl: typeof fetch = fetch, url = "/api/chat"): ChatService {
  return {
    async *send(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatStreamEvent> {
      let response: Response;

      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Service temporarily unavailable.";
        yield { type: "error", message };
        return;
      }

      if (!response.ok) {
        yield {
          type: "error",
          message: await readProxyError(response),
          statusCode: response.status,
          errorCode: await readProxyErrorCode(response)
        };
        return;
      }

      if (!response.body) {
        yield {
          type: "error",
          message: "Service temporarily unavailable.",
          statusCode: response.status
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let emittedDone = false;

      while (!emittedDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const parsed = parseSseChunk(decoder.decode(value, { stream: true }), buffer);
        buffer = parsed.buffer;

        for (const event of parsed.events) {
          if (isSseDoneData(event.data)) {
            emittedDone = true;
            try {
              await reader.cancel();
            } catch {}
            yield { type: "done" };
            break;
          }

          try {
            const payload = JSON.parse(event.data);
            if (payload && typeof payload === "object" && payload.error) {
              const errorData = payload.error && typeof payload.error === "object" ? payload.error : {};
              yield {
                type: "error",
                message:
                  typeof payload.message === "string"
                    ? payload.message
                    : typeof payload.content === "string" && hasVisibleText(payload.content)
                      ? payload.content
                      : "Service temporarily unavailable.",
                statusCode:
                  typeof errorData.status === "number"
                    ? errorData.status
                    : undefined,
                errorCode:
                  typeof errorData.code === "string"
                    ? errorData.code
                    : undefined
              };
              emittedDone = true;
              try {
                await reader.cancel();
              } catch {}
              break;
            }
            const content = payload.content || (payload.data && payload.data.content);
            if (hasVisibleText(content)) {
              yield { type: "delta", content };
            }
          } catch {}
        }
      }

      if (!emittedDone) {
        yield { type: "done" };
      }
    }
  };
}
