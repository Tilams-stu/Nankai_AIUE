import {
  CORE_ASSESSMENT_FIELDS,
  type AssessmentEvidence,
  type AssessmentFieldKey,
  type AssessmentFieldState,
  type AssessmentFieldStatus,
  type AssessmentState,
  createInitialAssessmentState
} from "../domain/assessmentFields.js";
import type { DialogueStageCode } from "../domain/dialogueStage.js";
import type { SafetyStatus } from "../domain/safetyStatus.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";

export interface AssessmentTurnContext {
  channel: "chat" | "gad7";
  currentStage: DialogueStageCode;
  transcriptEntryId?: string;
  safetyStatus?: SafetyStatus;
  safetyChanged?: boolean;
  now?: Date;
}

export interface AssessmentService {
  createInitialAssessmentState(now?: Date): AssessmentState;
  markFieldAsked(state: AssessmentState, fieldKey: AssessmentFieldKey, askedTurn: number, now?: Date): AssessmentState;
  updateAssessmentField(
    state: AssessmentState,
    fieldKey: AssessmentFieldKey,
    value: string,
    evidence: AssessmentEvidence,
    status?: AssessmentFieldStatus
  ): AssessmentState;
  updateFromTurn(state: AssessmentState, text: string, context: AssessmentTurnContext): AssessmentState;
  getMissingCoreFields(state: AssessmentState): AssessmentFieldKey[];
  summarizeAssessmentProgress(state: AssessmentState): string;
}

const KEYWORD_GROUPS: Array<{ key: AssessmentFieldKey; patterns: RegExp[]; partial?: boolean }> = [
  {
    key: "campus_context",
    patterns: [/宿舍|室友|同学|老师|导师|课题|论文|考试|保研|考研|找工作|求职|实习|上课|学院|辅导员|机房|暑假|放假/]
  },
  {
    key: "emotion_state",
    patterns: [/焦虑|紧张|低落|难过|崩溃|烦躁|害怕|空虚|压抑|委屈|内疚|失望|绝望|心烦|很烦|发闷/]
  },
  {
    key: "cognition_state",
    patterns: [/总觉得|一直想|控制不住地想|注意力|没办法集中|担心|胡思乱想|自责|觉得自己很差|脑子很乱/]
  },
  {
    key: "behavior_state",
    patterns: [/不想出门|回避|拖延|哭|发脾气|躺着|不上课|不想见人|刷手机刷到很晚|逃避/]
  },
  {
    key: "somatic_state",
    patterns: [/头痛|胃痛|胸闷|心慌|没力气|没(?:什么)?精神|疲惫|恶心|身体不舒服|头晕|发抖/]
  },
  {
    key: "sleep_appetite",
    patterns: [/睡不着|失眠|早醒|睡眠|吃不下|没胃口|食欲|胃口|暴饮暴食|总想睡|熬夜/]
  },
  {
    key: "functional_impact",
    patterns: [/影响.*学习|影响.*上课|影响.*作业|影响.*论文|影响.*人际|影响.*生活|注意力下降|效率很差|起不来|不想洗漱|没法正常/]
  },
  {
    key: "support_history",
    patterns: [/心理咨询|心理中心|精神科|医院|校医院|老师|家人|朋友|对象|辅导员|吃药|用药|求助/]
  }
];

const DURATION_PATTERNS = [
  /最近(?:这)?段时间/,
  /[一二三四五六七八九十两\d]+天/,
  /[一二三四五六七八九十两\d]+周/,
  /[一二三四五六七八九十两\d]+个月/,
  /[一二三四五六七八九十两\d]+年/,
  /从.+开始/,
  /开学后/,
  /期末前后/
];

const SCALE_PATTERNS = [/PHQ-9|GAD-7|量表|打分|得分|问卷/i];
const REFUSAL_PATTERNS = [/不想说|不太想说|不方便说|不想回答|不回答|先不说|不清楚|不知道/];
const MILD_STATE_PATTERNS = /(还行|还好|一般|就那样|没什么变化|没有明显变化)/;
const LOW_IMPACT_PATTERNS = /(没有明显影响|影响不大|没怎么影响|还不至于影响|暂时没影响|没有受影响|不影响学习|不影响生活)/;
const CHIEF_COMPLAINT_PATTERNS = /\u538b\u529b|\u56f0\u6270|\u96be\u53d7|\u75db\u82e6|\u5f88\u7d2f|\u75b2\u60eb|\u7126\u8651|\u70e6\u8e81|\u4f4e\u843d|\u60c5\u7eea|\u5d29\u6e83|\u5931\u7720|\u7761\u4e0d\u7740|\u4e0d\u60f3\u6d3b/;
const SLEEP_DELAY_PATTERNS = /\u62d6\u7740\u4e0d\u7761|\u4e00\u76f4\u4e0d\u7761|\u5230\u5f88\u665a\u624d\u7761/;
const FUNCTIONAL_SOCIAL_PATTERNS = /\u5199\u4f5c\u4e1a.*\u62d6|\u62d6\u5f88\u4e45|\u6548\u7387\u4f4e|\u6548\u7387\u5f88\u5dee|\u4e0d\u592a\u60f3\u804a\u5929|\u4e0d\u60f3\u548c\u4eba\u8bf4\u8bdd|\u51cf\u5c11.*\u4ea4\u6d41|\u4e0d\u60f3\u89c1\u4eba/;
const SUPPORT_RELATION_PATTERNS = /\u5bb6\u4eba|\u7236\u6bcd|\u670b\u53cb|\u5ba4\u53cb|\u540c\u5b66|\u5bfc\u5458|\u8001\u5e08/;
const SUPPORT_ACTION_PATTERNS = /\u503e\u8bc9|\u6c42\u52a9|\u652f\u6301|\u5e2e\u52a9|\u966a\u4f34|\u5b89\u6170|\u804a\u8fc7|\u544a\u8bc9|\u8054\u7cfb/;

function cloneField(field: AssessmentFieldState): AssessmentFieldState {
  return {
    ...field,
    evidence: field.evidence.map((item) => ({ ...item }))
  };
}

function mergeValue(existingValue: string, nextValue: string): { value: string; status: AssessmentFieldStatus } {
  if (!existingValue) {
    return {
      value: nextValue,
      status: "collected"
    };
  }

  if (existingValue === nextValue) {
    return {
      value: existingValue,
      status: "collected"
    };
  }

  if (existingValue.includes(nextValue) || nextValue.includes(existingValue)) {
    return {
      value: existingValue.length >= nextValue.length ? existingValue : nextValue,
      status: "collected"
    };
  }

  return {
    value: `${existingValue}；${nextValue}`,
    status: "partially_collected"
  };
}

function buildEvidence(text: string, context: AssessmentTurnContext): AssessmentEvidence {
  return {
    transcriptEntryId: context.transcriptEntryId,
    excerpt: sanitizePlainText(text).slice(0, 120),
    collectedAtIso: (context.now || new Date()).toISOString(),
    confidence: 0.7,
    sourceType: context.channel === "gad7" ? "scale_result" : "user_explicit"
  };
}

function hasChiefComplaintEvidence(text: string): boolean {
  return CHIEF_COMPLAINT_PATTERNS.test(text);
}

function hasSupportEvidence(text: string): boolean {
  const directService = /心理咨询|心理中心|精神科|医院|校医院|吃药|用药/.test(text);
  return directService || (SUPPORT_RELATION_PATTERNS.test(text) && SUPPORT_ACTION_PATTERNS.test(text));
}

export function createAssessmentStateService(): AssessmentService {
  return {
    createInitialAssessmentState(now = new Date()) {
      return createInitialAssessmentState(now);
    },
    markFieldAsked(state, fieldKey, askedTurn, now = new Date()) {
      const currentField = cloneField(state.fields[fieldKey]);
      return {
        fields: {
          ...state.fields,
          [fieldKey]: {
            ...currentField,
            lastAskedTurn: askedTurn,
            lastAskedAtIso: now.toISOString()
          }
        },
        lastUpdatedAtIso: state.lastUpdatedAtIso
      };
    },
    updateAssessmentField(state, fieldKey, value, evidence, status) {
      const nextValue = sanitizePlainText(value);
      if (!nextValue) return state;

      const currentField = cloneField(state.fields[fieldKey]);
      const merged = mergeValue(currentField.value, nextValue);
      const nextField: AssessmentFieldState = {
        ...currentField,
        value: merged.value,
        status: status || merged.status,
        evidence: [...currentField.evidence, evidence],
        lastUpdatedAtIso: evidence.collectedAtIso
      };

      return {
        fields: {
          ...state.fields,
          [fieldKey]: nextField
        },
        lastUpdatedAtIso: evidence.collectedAtIso
      };
    },
    updateFromTurn(state, text, context) {
      const sanitized = sanitizePlainText(text);
      if (!sanitized) return state;

      const evidence = buildEvidence(sanitized, context);
      let nextState = state;

      if (REFUSAL_PATTERNS.some((pattern) => pattern.test(sanitized))) {
        const targetKey: AssessmentFieldKey =
          context.currentStage === "D7_safety_check" ? "risk_disclosure" : "chief_complaint";

        const targetField = nextState.fields[targetKey];
        nextState = {
          fields: {
            ...nextState.fields,
            [targetKey]: {
              ...cloneField(targetField),
              status: "refused",
              evidence: [...targetField.evidence, evidence],
              lastUpdatedAtIso: evidence.collectedAtIso
            }
          },
          lastUpdatedAtIso: evidence.collectedAtIso
        };
      }

      if (hasChiefComplaintEvidence(sanitized)) {
        nextState = this.updateAssessmentField(nextState, "chief_complaint", sanitized, evidence, "partially_collected");
      }

      if (DURATION_PATTERNS.some((pattern) => pattern.test(sanitized))) {
        nextState = this.updateAssessmentField(nextState, "duration", sanitized, evidence);
      }

      if (MILD_STATE_PATTERNS.test(sanitized)) {
        nextState = this.updateAssessmentField(nextState, "emotion_state", sanitized, evidence, "partially_collected");
      }

      if (LOW_IMPACT_PATTERNS.test(sanitized)) {
        nextState = this.updateAssessmentField(nextState, "functional_impact", sanitized, evidence, "collected");
      }

      KEYWORD_GROUPS.forEach((group) => {
        if (group.key === "support_history" ? hasSupportEvidence(sanitized) : group.patterns.some((pattern) => pattern.test(sanitized))) {
          nextState = this.updateAssessmentField(
            nextState,
            group.key,
            sanitized,
            evidence,
            group.partial ? "partially_collected" : "collected"
          );
        }
      });

      if (SLEEP_DELAY_PATTERNS.test(sanitized)) {
        nextState = this.updateAssessmentField(nextState, "sleep_appetite", sanitized, evidence);
      }

      if (FUNCTIONAL_SOCIAL_PATTERNS.test(sanitized)) {
        nextState = this.updateAssessmentField(nextState, "functional_impact", sanitized, evidence);
      }

      if (SCALE_PATTERNS.some((pattern) => pattern.test(sanitized)) || context.channel === "gad7") {
        nextState = this.updateAssessmentField(nextState, "scale_result", sanitized, evidence, "partially_collected");
      }

      if (context.safetyStatus && context.safetyStatus.summary !== "not_asked" && context.safetyChanged !== false) {
        nextState = this.updateAssessmentField(
          nextState,
          "risk_disclosure",
          sanitized,
          evidence,
          context.safetyStatus.summary === "no_immediate_risk_disclosed" ? "collected" : "partially_collected"
        );
      }

      return nextState;
    },
    getMissingCoreFields(state) {
      return CORE_ASSESSMENT_FIELDS.filter((key) => {
        const status = state.fields[key].status;
        return !["collected", "partially_collected", "refused"].includes(status);
      });
    },
    summarizeAssessmentProgress(state) {
      const collected = Object.values(state.fields).filter((field) =>
        ["collected", "partially_collected", "refused"].includes(field.status)
      ).length;
      return `${collected}/${Object.keys(state.fields).length} fields touched`;
    }
  };
}
