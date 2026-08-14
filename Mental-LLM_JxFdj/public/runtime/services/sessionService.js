import { createSessionState } from "../domain/session.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";
export function createSessionService(nowFactory = () => new Date()) {
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
