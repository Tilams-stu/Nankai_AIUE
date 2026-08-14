import { initialSafetyStatus } from "../domain/safetyStatus.js";
import { SESSION_SNAPSHOT_SCHEMA_VERSION, isSessionSnapshotV1 } from "../contracts/sessionSnapshotContract.js";
function cloneState(state) {
    return {
        activeView: state.activeView,
        session: {
            ...state.session,
            dialogueStage: {
                ...state.session.dialogueStage,
                completedStages: [...state.session.dialogueStage.completedStages]
            },
            interaction: {
                ...state.session.interaction,
                boundaries: state.session.interaction.boundaries.map((boundary) => ({ ...boundary }))
            },
            assessment: {
                ...state.session.assessment,
                fields: Object.fromEntries(Object.entries(state.session.assessment.fields).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        evidence: value.evidence.map((item) => ({ ...item }))
                    }
                ]))
            },
            identity: {
                ...state.session.identity
            }
        },
        safety: cloneSafety(state.safety),
        transcript: {
            entries: state.transcript.entries.map((entry) => ({
                ...entry
            }))
        },
        upload: {
            ...state.upload
        }
    };
}
function cloneSafety(safety) {
    return {
        ...initialSafetyStatus,
        ...safety,
        safetyConfirmation: safety.safetyConfirmation ||
            (safety.workflowLabel !== "R0"
                ? "pending"
                : safety.screeningStatus === "completed"
                    ? "confirmed_safe"
                    : "not_started"),
        peakWorkflowLabel: safety.peakWorkflowLabel || safety.workflowLabel || "R0",
        peakSummary: safety.peakSummary || safety.summary || "not_asked",
        evidence: (safety.evidence || []).map((item) => ({ ...item })),
        triggeredRuleIds: [...(safety.triggeredRuleIds || [])]
    };
}
export function createSessionSnapshotService(nowFactory = () => new Date()) {
    return {
        exportSnapshot(state) {
            return {
                schemaVersion: SESSION_SNAPSHOT_SCHEMA_VERSION,
                exportedAtIso: nowFactory().toISOString(),
                state: cloneState(state)
            };
        },
        restoreSnapshot(snapshot, fallback) {
            return {
                ...cloneState(fallback),
                ...cloneState(snapshot.state)
            };
        },
        parseSnapshot(value, fallback) {
            if (!isSessionSnapshotV1(value)) {
                return null;
            }
            return this.restoreSnapshot(value, fallback);
        }
    };
}
