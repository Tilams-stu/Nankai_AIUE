export const SSE_DONE_TOKEN = "[DONE]";
export function parseSseChunk(chunk, existingBuffer = "") {
    const combined = (existingBuffer + chunk).replace(/\r\n/g, "\n");
    const lines = combined.split("\n");
    const buffer = lines.pop() ?? "";
    const events = [];
    for (const line of lines) {
        if (!line.startsWith("data:"))
            continue;
        events.push({ data: line.slice(5).trim() });
    }
    return { events, buffer };
}
export function isSseDoneData(data) {
    return data === SSE_DONE_TOKEN;
}
