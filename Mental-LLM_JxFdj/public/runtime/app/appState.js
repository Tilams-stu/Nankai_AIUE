import { createSessionState } from "../domain/session.js";
import { initialSafetyStatus } from "../domain/safetyStatus.js";
import { initialTranscriptState } from "../domain/transcript.js";
import { initialUploadStatus } from "../domain/uploadStatus.js";
export const initialAppState = {
    activeView: "chat",
    session: createSessionState({ activeView: "chat" }),
    safety: initialSafetyStatus,
    transcript: initialTranscriptState,
    upload: initialUploadStatus
};
