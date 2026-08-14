export type TranscriptChannel = "chat" | "gad7";

export type TranscriptRole = "user" | "agent" | "system";

export type TranscriptSource = "user_input" | "agent_response" | "system_note" | "hidden_context";

export type TranscriptStatus = "streaming" | "final";

export interface TranscriptEntry {
  id: string;
  channel: TranscriptChannel;
  role: TranscriptRole;
  content: string;
  hidden: boolean;
  source: TranscriptSource;
  status: TranscriptStatus;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface TranscriptState {
  entries: TranscriptEntry[];
}

export const initialTranscriptState: TranscriptState = {
  entries: []
};

export function isVisibleFinalTranscriptEntry(entry: TranscriptEntry): boolean {
  return !entry.hidden && entry.status === "final" && entry.content.trim().length > 0;
}
