import { initialTranscriptState, isVisibleFinalTranscriptEntry } from "../domain/transcript.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";
export function createTranscriptService(nowFactory = () => new Date()) {
    let counter = 0;
    function nextEntryId(now) {
        counter += 1;
        return `transcript_${now.getTime()}_${counter}`;
    }
    return {
        create() {
            return {
                entries: [...initialTranscriptState.entries]
            };
        },
        reset() {
            return {
                entries: []
            };
        },
        append(state, input) {
            const now = nowFactory();
            const timestamp = now.toISOString();
            const entry = {
                id: nextEntryId(now),
                channel: input.channel,
                role: input.role,
                content: sanitizePlainText(input.content),
                hidden: Boolean(input.hidden),
                source: input.source || (input.hidden ? "hidden_context" : input.role === "agent" ? "agent_response" : "user_input"),
                status: input.status || "final",
                createdAtIso: timestamp,
                updatedAtIso: timestamp
            };
            return {
                state: {
                    entries: [...state.entries, entry]
                },
                entry
            };
        },
        update(state, entryId, patch) {
            let updatedEntry = null;
            const nowIso = nowFactory().toISOString();
            const entries = state.entries.map((entry) => {
                if (entry.id !== entryId)
                    return entry;
                updatedEntry = {
                    ...entry,
                    content: patch.content === undefined ? entry.content : sanitizePlainText(patch.content),
                    hidden: patch.hidden === undefined ? entry.hidden : patch.hidden,
                    source: patch.source || entry.source,
                    status: patch.status || entry.status,
                    updatedAtIso: nowIso
                };
                return updatedEntry;
            });
            return {
                state: { entries },
                entry: updatedEntry
            };
        },
        list(state, options = {}) {
            const filtered = state.entries.filter((entry) => {
                if (options.channel && entry.channel !== options.channel)
                    return false;
                if (!options.includeHidden && entry.hidden)
                    return false;
                if (options.finalOnly && !isVisibleFinalTranscriptEntry(entry))
                    return false;
                if (options.roles && !options.roles.includes(entry.role))
                    return false;
                return true;
            });
            if (!options.limit || filtered.length <= options.limit) {
                return filtered;
            }
            return filtered.slice(-options.limit);
        }
    };
}
