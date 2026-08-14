export function createInitialInteractionState(now = new Date()) {
    return {
        mode: "support",
        questionPermission: "natural_follow_up",
        assessmentPermission: "allowed",
        boundaries: [],
        lastIntent: "acknowledgement",
        lastSubject: "unknown",
        lastUpdatedAtIso: now.toISOString()
    };
}
