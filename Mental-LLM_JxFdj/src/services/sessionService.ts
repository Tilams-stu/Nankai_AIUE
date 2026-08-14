import {
  type ActiveView,
  type ConsentStatus,
  type InformationStatus,
  type SessionIdentity,
  type SessionState,
  type UserControlState,
  createSessionState
} from "../domain/session.js";
import type { AssessmentState } from "../domain/assessmentFields.js";
import type { DialogueStageState } from "../domain/dialogueStage.js";
import type { InteractionState } from "../domain/interactionState.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";

export interface SessionService {
  create(activeView?: ActiveView): SessionState;
  reset(activeView?: ActiveView): SessionState;
  setActiveView(session: SessionState, activeView: ActiveView): SessionState;
  setConsentStatus(session: SessionState, consentStatus: ConsentStatus): SessionState;
  setUserControl(session: SessionState, userControl: UserControlState): SessionState;
  setInformationStatus(session: SessionState, informationStatus: InformationStatus): SessionState;
  setIdentity(session: SessionState, identity: SessionIdentity): SessionState;
  setDialogueStage(session: SessionState, dialogueStage: DialogueStageState): SessionState;
  setInteraction(session: SessionState, interaction: InteractionState): SessionState;
  setAssessment(session: SessionState, assessment: AssessmentState): SessionState;
}

export function createSessionService(nowFactory: () => Date = () => new Date()): SessionService {
  return {
    create(activeView = "chat") {
      return createSessionState({ activeView, now: nowFactory() });
    },
    reset(activeView = "chat") {
      return createSessionState({ activeView, now: nowFactory() });
    },
    setActiveView(session, activeView) {
      return {
        ...session,
        activeView
      };
    },
    setConsentStatus(session, consentStatus) {
      return {
        ...session,
        consentStatus
      };
    },
    setUserControl(session, userControl) {
      return {
        ...session,
        userControl
      };
    },
    setInformationStatus(session, informationStatus) {
      return {
        ...session,
        informationStatus
      };
    },
    setIdentity(session, identity) {
      return {
        ...session,
        identity: {
          ...identity,
          userId: sanitizePlainText(identity.userId),
          userName: identity.userName ? sanitizePlainText(identity.userName) : undefined
        }
      };
    },
    setDialogueStage(session, dialogueStage) {
      return {
        ...session,
        dialogueStage
      };
    },
    setInteraction(session, interaction) {
      return {
        ...session,
        interaction: {
          ...interaction,
          boundaries: interaction.boundaries.map((boundary) => ({ ...boundary }))
        }
      };
    },
    setAssessment(session, assessment) {
      return {
        ...session,
        assessment
      };
    }
  };
}
