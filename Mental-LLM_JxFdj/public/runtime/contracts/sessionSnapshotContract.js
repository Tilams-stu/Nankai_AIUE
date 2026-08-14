export const SESSION_SNAPSHOT_SCHEMA_VERSION = "session_snapshot_v2";
export const SESSION_SNAPSHOT_LEGACY_SCHEMA_VERSION = "session_snapshot_v1";
export const SESSION_SNAPSHOT_CURRENT_SCHEMA_VERSION = "session_snapshot_v2";
export function isSessionSnapshotV1(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    if (candidate.schemaVersion !== SESSION_SNAPSHOT_SCHEMA_VERSION &&
        candidate.schemaVersion !== SESSION_SNAPSHOT_CURRENT_SCHEMA_VERSION &&
        candidate.schemaVersion !== SESSION_SNAPSHOT_LEGACY_SCHEMA_VERSION) {
        return false;
    }
    if (typeof candidate.exportedAtIso !== "string")
        return false;
    if (!candidate.state || typeof candidate.state !== "object")
        return false;
    return true;
}
