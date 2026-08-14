import { type ActiveView, type SessionState, createSessionState } from "../domain/session.js";
import { type SafetyStatus, initialSafetyStatus } from "../domain/safetyStatus.js";
import { type TranscriptState, initialTranscriptState } from "../domain/transcript.js";
import { type UploadStatus, initialUploadStatus } from "../domain/uploadStatus.js";

export interface AppState {
  activeView: ActiveView;
  session: SessionState;
  safety: SafetyStatus;
  transcript: TranscriptState;
  upload: UploadStatus;
}

export const initialAppState: AppState = {
  activeView: "chat",
  session: createSessionState({ activeView: "chat" }),
  safety: initialSafetyStatus,
  transcript: initialTranscriptState,
  upload: initialUploadStatus
};
