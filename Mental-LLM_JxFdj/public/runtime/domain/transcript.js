export const initialTranscriptState = {
    entries: []
};
export function isVisibleFinalTranscriptEntry(entry) {
    return !entry.hidden && entry.status === "final" && entry.content.trim().length > 0;
}
