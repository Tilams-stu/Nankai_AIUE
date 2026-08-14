import type { AppState } from "../app/appState.js";

export const SESSION_SNAPSHOT_SCHEMA_VERSION = "session_snapshot_v2";
export const SESSION_SNAPSHOT_LEGACY_SCHEMA_VERSION = "session_snapshot_v1";
export const SESSION_SNAPSHOT_CURRENT_SCHEMA_VERSION = "session_snapshot_v2";

export interface SessionSnapshotV1 {
  schemaVersion: typeof SESSION_SNAPSHOT_SCHEMA_VERSION | typeof SESSION_SNAPSHOT_CURRENT_SCHEMA_VERSION;
  exportedAtIso: string;
  state: AppState;
}

export function isSessionSnapshotV1(value: unknown): value is SessionSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== SESSION_SNAPSHOT_SCHEMA_VERSION &&
    candidate.schemaVersion !== SESSION_SNAPSHOT_CURRENT_SCHEMA_VERSION &&
    candidate.schemaVersion !== SESSION_SNAPSHOT_LEGACY_SCHEMA_VERSION
  ) {
    return false;
  }
  if (typeof candidate.exportedAtIso !== "string") return false;
  if (!candidate.state || typeof candidate.state !== "object") return false;
  return true;
}
