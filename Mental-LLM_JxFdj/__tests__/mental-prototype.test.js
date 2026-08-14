import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createConversationContextService } from "../public/runtime/services/conversationContextService.js";
import { createConversationPolicyService } from "../public/runtime/services/conversationPolicyService.js";
import { createAssessmentStateService } from "../public/runtime/services/assessmentStateService.js";
import { createDialogueStageService } from "../public/runtime/services/dialogueStageService.js";
import { createReportTemplateService } from "../public/runtime/services/reportTemplateService.js";
import { buildReportDraftPayload } from "../public/runtime/services/reportDraftService.js";
import { createWorkflowPayloadService } from "../public/runtime/services/workflowPayloadService.js";
import { createWorkflowService } from "../public/runtime/services/workflowService.js";
import { toReportToFeishuInput } from "../public/runtime/contracts/workflowContract.js";
import { createSafetyRuleService } from "../public/runtime/services/safetyRuleService.js";
import { createSessionSnapshotService } from "../public/runtime/services/sessionSnapshotService.js";
import { createSessionState } from "../public/runtime/domain/session.js";
import { initialSafetyStatus } from "../public/runtime/domain/safetyStatus.js";
import { initialTranscriptState } from "../public/runtime/domain/transcript.js";
import { initialUploadStatus } from "../public/runtime/domain/uploadStatus.js";
import { createTranscriptService } from "../public/runtime/services/transcriptService.js";
import { createAgentResponseGuardService } from "../public/runtime/services/agentResponseGuardService.js";
import { createSupplementalAssessmentService } from "../public/runtime/services/supplementalAssessmentService.js";
import { createTurnInterpretationService } from "../public/runtime/services/turnInterpretationService.js";
import { createInteractionStateService } from "../public/runtime/services/interactionStateService.js";
import { createResponsePlanningService } from "../public/runtime/services/responsePlanningService.js";
import { createReportAutoUpdateCoordinator } from "../public/runtime/services/reportAutoUpdateCoordinator.js";

function cloneSafety() {
  return {
    ...initialSafetyStatus,
    evidence: [],
    triggeredRuleIds: []
  };
}

function createTestState() {
  const assessmentService = createAssessmentStateService();
  const transcriptService = createTranscriptService(() => new Date("2026-07-28T09:00:00Z"));
  let session = createSessionState({
    activeView: "chat",
    consentStatus: "accepted",
    now: new Date("2026-07-28T09:00:00Z")
  });
  let assessmentState = session.assessment;
  assessmentState = assessmentService.updateFromTurn(assessmentState, "最近一个月论文压力很大。", {
    channel: "chat",
    currentStage: "D2_open_concern",
    transcriptEntryId: "turn_3",
    now: new Date("2026-07-28T09:20:00Z")
  });
  assessmentState = assessmentService.updateFromTurn(assessmentState, "晚上睡不着，白天注意力也差。", {
    channel: "chat",
    currentStage: "D5_state_review",
    transcriptEntryId: "turn_4",
    now: new Date("2026-07-28T09:21:00Z")
  });
  session = {
    ...session,
    assessment: assessmentState
  };
  const transcript = transcriptService.append(initialTranscriptState, {
    channel: "chat",
    role: "user",
    content: "最近一个月论文压力很大。",
    source: "user_input"
  }).state;
  return {
    activeView: "chat",
    session,
    safety: cloneSafety(),
    transcript,
    upload: initialUploadStatus
  };
}

test("assessment service captures concern, duration, emotion and sleep signals", () => {
  const service = createAssessmentStateService();
  const state = service.updateFromTurn(
    service.createInitialAssessmentState(new Date("2026-07-28T09:00:00Z")),
    "最近一个月论文和找工作压在一起，晚上睡不着，也越来越焦虑。",
    {
      channel: "chat",
      currentStage: "D2_open_concern",
      transcriptEntryId: "turn_1",
      now: new Date("2026-07-28T09:00:00Z")
    }
  );

  assert.equal(state.fields.chief_complaint.status, "partially_collected");
  assert.equal(state.fields.duration.status, "collected");
  assert.equal(state.fields.emotion_state.status, "collected");
  assert.equal(state.fields.sleep_appetite.status, "collected");
});

test("assessment only records explicit self-evidence and keeps greetings out of the report", () => {
  const service = createAssessmentStateService();
  const initial = service.createInitialAssessmentState(new Date("2026-07-31T09:00:00Z"));
  const greeting = service.updateFromTurn(initial, "\u4f60\u597d\uff0c\u4eca\u5929\u5c31\u60f3\u968f\u4fbf\u804a\u804a", {
    channel: "chat",
    currentStage: "D2_open_concern",
    transcriptEntryId: "turn_greeting",
    now: new Date("2026-07-31T09:00:00Z")
  });
  const closing = service.updateFromTurn(greeting, "\u8fd9\u4e2a\u57fa\u672c\u4e0a\u6ca1\u6709\u4e86", {
    channel: "chat",
    currentStage: "D4_campus_context",
    transcriptEntryId: "turn_closing",
    now: new Date("2026-07-31T09:01:00Z")
  });

  assert.equal(closing.fields.chief_complaint.status, "not_asked");
  assert.equal(closing.fields.chief_complaint.value, "");
});

test("assessment captures delayed sleep and study or social functional impact", () => {
  const service = createAssessmentStateService();
  const state = service.updateFromTurn(
    service.createInitialAssessmentState(new Date("2026-07-31T09:00:00Z")),
    "\u665a\u4e0a\u5bb9\u6613\u62d6\u7740\u4e0d\u7761\uff0c\u5199\u4f5c\u4e1a\u4f1a\u62d6\u5f88\u4e45\uff0c\u6700\u8fd1\u4e5f\u4e0d\u592a\u60f3\u804a\u5929", {
      channel: "chat",
      currentStage: "D4_campus_context",
      transcriptEntryId: "turn_functional_sleep",
      now: new Date("2026-07-31T09:00:00Z")
    }
  );

  assert.equal(state.fields.sleep_appetite.status, "collected");
  assert.equal(state.fields.functional_impact.status, "collected");
});

test("family discussion is not treated as support history without help-seeking evidence", () => {
  const service = createAssessmentStateService();
  const state = service.updateFromTurn(
    service.createInitialAssessmentState(new Date("2026-07-31T09:00:00Z")),
    "\u6211\u60f3\u5230\u7ed9\u5bb6\u4eba\u6253\u7535\u8bdd\u5c31\u4f1a\u62d6\u5ef6", {
      channel: "chat",
      currentStage: "D4_campus_context",
      transcriptEntryId: "turn_family_context",
      now: new Date("2026-07-31T09:00:00Z")
    }
  );

  assert.equal(state.fields.support_history.status, "not_asked");
});

test("safety rules distinguish explicit denial from quoted third-party risk", () => {
  const service = createSafetyRuleService();
  const denied = service.evaluateText(cloneSafety(), "没有。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:05:00Z")
  });

  assert.equal(denied.nextStatus.workflowLabel, "R0");
  assert.equal(denied.nextStatus.ideation, "denied");
  assert.equal(denied.nextStatus.screeningStatus, "completed");

  const quoted = service.evaluateText(cloneSafety(), "我室友说他不想活了，但不是我。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:06:00Z")
  });

  assert.equal(quoted.nextStatus.workflowLabel, "R0");
  assert.equal(quoted.nextStatus.evidence.at(-1)?.subject, "other_person");
});

test("a prompted safety confirmation accepts a direct denial from any dialogue stage", () => {
  const service = createSafetyRuleService();
  const prompted = {
    ...cloneSafety(),
    screeningStatus: "prompted"
  };
  const denied = service.evaluateText(prompted, "没有", {
    currentStage: "D4_context_explore",
    now: new Date("2026-07-28T09:05:00Z")
  });

  assert.equal(denied.nextStatus.workflowLabel, "R0");
  assert.equal(denied.nextStatus.screeningStatus, "completed");
});

test("safety screening stays open without a clear answer and records refusal separately", () => {
  const service = createSafetyRuleService();
  const open = service.evaluateText(cloneSafety(), "今天只是有点累", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:07:00Z")
  });
  assert.equal(open.nextStatus.screeningStatus, "not_started");
  assert.equal(open.changed, false);

  const refused = service.evaluateText(cloneSafety(), "这个我不方便回答", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:08:00Z")
  });
  assert.equal(refused.nextStatus.screeningStatus, "incomplete");
  assert.equal(refused.nextStatus.workflowLabel, "RX");
  assert.equal(refused.nextStatus.evidence.at(-1)?.excerpt, "这个我不方便回答");
});

test("current safety clarification preserves the historical risk peak", () => {
  const service = createSafetyRuleService();
  const risk = service.evaluateText(cloneSafety(), "最近经常觉得想消失", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:09:00Z")
  }).nextStatus;
  const clarified = service.evaluateText(risk, "我现在是安全的，没有马上伤害自己的打算，但那些想消失的念头还会出现。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:10:00Z")
  }).nextStatus;
  const cleared = service.evaluateText(clarified, "没有。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:11:00Z")
  }).nextStatus;

  assert.equal(risk.workflowLabel, "R1");
  assert.equal(risk.peakWorkflowLabel, "R1");
  assert.equal(clarified.workflowLabel, "R1");
  assert.equal(clarified.safetyConfirmation, "confirmed_safe");
  assert.equal(cleared.workflowLabel, "R0");
  assert.equal(cleared.summary, "no_immediate_risk_disclosed");
  assert.equal(cleared.peakWorkflowLabel, "R1");
  assert.equal(cleared.peakSummary, "needs_follow_up");
});

test("assessment captures natural context, mild state, and explicit low impact", () => {
  const service = createAssessmentStateService();
  const state = service.updateFromTurn(
    service.createInitialAssessmentState(new Date("2026-07-28T09:00:00Z")),
    "白天主要在机房待着，没什么精神，但学习没有明显影响。",
    {
      channel: "chat",
      currentStage: "D2_open_concern",
      transcriptEntryId: "turn_natural_1",
      now: new Date("2026-07-28T09:00:00Z")
    }
  );

  assert.equal(state.fields.campus_context.status, "collected");
  assert.equal(state.fields.somatic_state.status, "collected");
  assert.equal(state.fields.functional_impact.status, "collected");
});

test("dialogue stage escalates to crisis stage when immediate risk is detected", () => {
  const assessmentService = createAssessmentStateService();
  const safetyService = createSafetyRuleService();
  const stageService = createDialogueStageService();

  const assessmentState = assessmentService.updateFromTurn(
    assessmentService.createInitialAssessmentState(new Date("2026-07-28T09:10:00Z")),
    "我已经想好今晚吃药结束了。",
    {
      channel: "chat",
      currentStage: "D7_safety_check",
      transcriptEntryId: "turn_2",
      now: new Date("2026-07-28T09:10:00Z")
    }
  );
  const safetyState = safetyService.evaluateText(cloneSafety(), "我已经想好今晚吃药结束了。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:10:00Z")
  }).nextStatus;

  const nextStage = stageService.advanceDialogueStage(stageService.createInitialDialogueStageState(new Date("2026-07-28T09:09:00Z")), {
    type: "user_turn_recorded",
    consentStatus: "accepted",
    assessmentState,
    safetyState,
    activeView: "chat",
    uploadStatus: "processing",
    now: new Date("2026-07-28T09:10:00Z")
  });

  assert.equal(nextStage.currentStage, "C4_emergency_disposition");
});

test("conversation policy keeps a natural reply when the minimum information is sufficient", () => {
  const assessmentService = createAssessmentStateService();
  const safetyService = createSafetyRuleService();
  const policyService = createConversationPolicyService();

  let safetyState = cloneSafety();
  safetyState = safetyService.evaluateText(safetyState, "没有。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:11:00Z")
  }).nextStatus;

  let assessmentState = assessmentService.updateFromTurn(
    assessmentService.createInitialAssessmentState(new Date("2026-07-28T09:11:00Z")),
    "最近一个月论文压力很大，晚上也睡不着。",
    {
      channel: "chat",
      currentStage: "D2_open_concern",
      transcriptEntryId: "turn_policy_1",
      now: new Date("2026-07-28T09:11:00Z")
    }
  );
  assessmentState = assessmentService.updateFromTurn(
    assessmentState,
    "这已经影响到我上课和作业了。",
    {
      channel: "chat",
      currentStage: "D6_functional_impact",
      transcriptEntryId: "turn_policy_2",
      now: new Date("2026-07-28T09:12:00Z")
    }
  );
  assessmentState = assessmentService.updateFromTurn(
    assessmentState,
    "没有。",
    {
      channel: "chat",
      currentStage: "D7_safety_check",
      transcriptEntryId: "turn_policy_3",
      safetyStatus: safetyState,
      now: new Date("2026-07-28T09:13:00Z")
    }
  );

  const policy = policyService.buildConversationPolicy({
    ...createTestState(),
    session: {
      ...createTestState().session,
      assessment: assessmentState
    },
    safety: safetyState
  });

  assert.equal(policy.minimumSufficientInfo, true);
  assert.equal(policy.responseMode, "respond");
  assert.equal(policy.completionStatus, "sufficient");
});

test("conversation policy does not inject a proactive safety checklist", () => {
  const state = createTestState();
  state.session.assessment.fields.duration.status = "collected";
  state.session.assessment.fields.functional_impact.status = "collected";
  state.safety.screeningStatus = "not_started";
  state.session.dialogueStage.currentTurn = 4;

  const firstPolicy = createConversationPolicyService().buildConversationPolicy(state);
  assert.equal(firstPolicy.responseMode, "respond");
  assert.equal(firstPolicy.targetField, undefined);
  assert.notEqual(firstPolicy.completionStatus, "awaiting_safety");

  state.session.assessment.fields.risk_disclosure.lastAskedTurn = 4;
  state.safety.screeningStatus = "prompted";
  const repeatedPolicy = createConversationPolicyService().buildConversationPolicy(state);
  assert.equal(repeatedPolicy.responseMode, "respond");
  assert.equal(repeatedPolicy.targetField, undefined);
  assert.notEqual(repeatedPolicy.completionStatus, "awaiting_safety");
});

test("conversation policy closes only after a summary acknowledgement", () => {
  const state = createTestState();
  state.session.assessment.fields.duration.status = "collected";
  state.session.assessment.fields.functional_impact.status = "collected";
  state.session.assessment.fields.risk_disclosure.status = "collected";
  state.safety.screeningStatus = "completed";
  state.session.dialogueStage.currentStage = "D10_summary_confirm";
  state.transcript.entries.push({
    id: "turn_ack_1",
    channel: "chat",
    role: "user",
    content: "好的",
    hidden: false,
    source: "user_input",
    status: "final",
    createdAtIso: "2026-07-28T09:30:00Z",
    updatedAtIso: "2026-07-28T09:30:00Z"
  });

  const policy = createConversationPolicyService().buildConversationPolicy(state);
  assert.equal(policy.responseMode, "close");
  assert.equal(policy.completionStatus, "ready_to_close");
});

test("conversation policy recognizes a natural no-more-to-add closing reply", () => {
  const state = createTestState();
  state.session.dialogueStage.currentStage = "D10_summary_confirm";
  state.transcript.entries.push({
    id: "turn_ack_natural_close",
    channel: "chat",
    role: "user",
    content: "这个基本上没有了",
    hidden: false,
    source: "user_input",
    status: "final",
    createdAtIso: "2026-07-30T10:00:00Z",
    updatedAtIso: "2026-07-30T10:00:00Z"
  });

  const policy = createConversationPolicyService().buildConversationPolicy(state);
  assert.equal(policy.responseMode, "close");
  assert.equal(policy.completionStatus, "ready_to_close");
});

test("conversation policy closes after a low-information summary acknowledgement", () => {
  const state = createTestState();
  state.session.dialogueStage.currentStage = "D10_summary_confirm";
  state.transcript.entries.push({
    id: "turn_ack_limited_1",
    channel: "chat",
    role: "user",
    content: "好的",
    hidden: false,
    source: "user_input",
    status: "final",
    createdAtIso: "2026-07-28T09:31:00Z",
    updatedAtIso: "2026-07-28T09:31:00Z"
  });

  const policy = createConversationPolicyService().buildConversationPolicy(state);
  assert.equal(policy.minimumSufficientInfo, false);
  assert.equal(policy.responseMode, "close");
  assert.equal(policy.completionStatus, "ready_to_close");
});

test("conversation policy treats a brief answer to the duration question as continued dialogue", () => {
  const assessmentService = createAssessmentStateService();
  const policyService = createConversationPolicyService();
  const state = createTestState();
  let assessment = assessmentService.updateFromTurn(
    state.session.assessment,
    "我就是感觉情绪比较压抑",
    {
      channel: "chat",
      currentStage: "D2_open_concern",
      transcriptEntryId: "turn_depressed_mood",
      now: new Date("2026-07-30T08:59:00Z")
    }
  );
  assessment = assessmentService.updateFromTurn(
    assessment,
    "这几天吧",
    {
      channel: "chat",
      currentStage: "D3_concern_detail",
      transcriptEntryId: "turn_duration_short_answer",
      now: new Date("2026-07-30T09:00:00Z")
    }
  );
  state.session.assessment = assessment;
  state.transcript.entries.push({
    id: "turn_duration_short_answer",
    channel: "chat",
    role: "user",
    content: "这几天吧",
    hidden: false,
    source: "user_input",
    status: "final",
    createdAtIso: "2026-07-30T09:00:00Z",
    updatedAtIso: "2026-07-30T09:00:00Z"
  });

  const policy = policyService.buildConversationPolicy(state);
  assert.equal(policy.responseMode, "respond");
  assert.equal(policy.targetField, undefined);
  assert.notEqual(policy.completionStatus, "ready_to_close");
});

test("agent response guard rejects questions after a no-question boundary", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "respond",
    questionPermission: "forbidden",
    text: "这几天确实不好受。你想先从哪件事聊起？"
  });

  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.reason, "question_after_boundary");
});

test("agent response guard limits natural follow-up to one question", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "respond",
    questionPermission: "natural_follow_up",
    text: "\u6211\u542c\u5230\u4e86\u4f60\u521a\u624d\u8bf4\u7684\u538b\u529b\u3002\u4ec0\u4e48\u65f6\u5019\u5f00\u59cb\u7684\uff1f\u6700\u8fd1\u7761\u5f97\u600e\u4e48\u6837\uff1f"
  });

  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.reason, "too_many_questions");
});

test("agent response guard requires an immediate safety confirmation", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "safety_route",
    responseGoal: "safety",
    allowedQuestionGoal: "immediate_safety",
    questionPermission: "focused_clarify",
    text: "谢谢你告诉我。请联系信任的人、学校心理中心或医院急诊，你不需要一个人面对这些。"
  });

  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.reason, "missing_safety_confirmation");
});

test("agent response guard accepts a direct current safety confirmation", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "safety_route",
    responseGoal: "safety",
    allowedQuestionGoal: "immediate_safety",
    questionPermission: "focused_clarify",
    text: "你现在是否已经伤害自己，或觉得自己可能马上会伤害自己？如果有，请先联系身边的人或当地紧急服务。"
  });

  assert.equal(decision.shouldRetry, false);
});

test("agent response guard detects duplicate replies and varies the safety fallback", () => {
  const service = createAgentResponseGuardService();
  const plan = {
    responseMode: "safety_route",
    responseGoal: "safety",
    allowedQuestionGoal: "immediate_safety",
    questionPermission: "focused_clarify"
  };
  const firstFallback = service.buildFallback({
    ...plan,
    latestUserText: "我最近经常觉得想消失",
    recentAgentReplies: []
  });
  const duplicateDecision = service.inspect({
    ...plan,
    text: firstFallback,
    recentAgentReplies: [firstFallback]
  });
  const secondFallback = service.buildFallback({
    ...plan,
    latestUserText: "我还是有点害怕",
    recentAgentReplies: [firstFallback],
    avoidTexts: [firstFallback]
  });

  assert.equal(duplicateDecision.shouldRetry, true);
  assert.equal(duplicateDecision.reason, "duplicate_recent_reply");
  assert.notEqual(secondFallback, firstFallback);
  assert.match(secondFallback, /现在.*安全/);
});

test("agent response guard leaves explicit closing modes untouched", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "close",
    allowClosure: true,
    text: "谢谢你的表达，今天先到这里。"
  });

  assert.equal(decision.shouldRetry, false);
});

test("agent response guard retries an unsolicited closing offer", () => {
  const service = createAgentResponseGuardService();
  const decision = service.inspect({
    responseMode: "respond",
    allowClosure: false,
    text: "听起来这件事一直压在你身上。今天先到这里，之后想聊随时可以找我。"
  });

  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.reason, "early_closure_before_user_intent");
});

test("chat runtime falls back to a non-question when the repaired reply is still unsafe", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const state = createTestState();
  const runtimeRoot = path.join(process.cwd(), "public");
  const updates = [];
  const agentTurns = [];
  const requests = [];
  const latestUserMessage = "\u6700\u8fd1\u538b\u529b\u5f88\u5927";
  let requestCount = 0;

  globalThis.window = {
    __mentalImport: (specifier) => import(pathToFileURL(path.join(runtimeRoot, String(specifier).replace(/^\//, ""))).href),
    MentalSessionRuntime: { getState: () => state },
    MentalUploadRuntime: { shouldFinalizeFromUserTurn: async () => false }
  };
  globalThis.fetch = async (_url, options = {}) => {
    requestCount += 1;
    requests.push(JSON.parse(options.body));
    const content = "\\u7b2c\\u4e00\\u4e2a\\u95ee\\u9898\\uff1f\\u7b2c\\u4e8c\\u4e2a\\u95ee\\u9898\\uff1f";
    return new Response(`data: {"content":"${content}"}\n\ndata: [DONE]\n\n`, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" }
    });
  };

  try {
    await import(`../src/app/chatRuntime.js?guard-runtime-test=${Date.now()}`);
    const result = await window.MentalChatRuntime.sendConversation({
      arg: { text: latestUserMessage },
      inputElement: null,
      appendMessage: () => ({}),
      updateBubble: ({ html }) => updates.push(html),
      parseHtml: (text) => text,
      recordUserTranscript: async () => ({}),
      recordAgentTranscript: async (text) => {
        agentTurns.push(text);
      },
      url: "/api/chat",
      botId: "bot",
      userId: "student",
      userName: "Test",
      logLabel: "Guard test"
    });

    assert.equal(result, true);
    assert.equal(requestCount, 2);
    assert.equal(requests[0].additional_messages[0].content, latestUserMessage);
    assert.equal(requests[1].additional_messages[0].content, latestUserMessage);
    assert.match(requests[1].response_repair_instruction, /Replace the previous reply/);
    assert.equal(agentTurns.length, 1);
    assert.equal(/[?\\uff1f]/.test(agentTurns[0]), false);
    assert.equal(updates.length, 1);
    assert.equal(updates.at(-1).includes(latestUserMessage), true);
    assert.equal(updates.at(-1).includes("\u6211\u542c\u5230\u4e86\uff0c\u4f60\u53ef\u4ee5\u7ee7\u7eed\u8bf4\u4f60\u6700\u60f3\u8bf4\u7684\u90e8\u5206"), false);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("chat runtime commits an accepted streamed reply to the bubble once", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const state = createTestState();
  const runtimeRoot = path.join(process.cwd(), "public");
  const updates = [];

  globalThis.window = {
    __mentalImport: (specifier) => import(pathToFileURL(path.join(runtimeRoot, String(specifier).replace(/^\//, ""))).href),
    MentalSessionRuntime: { getState: () => state },
    MentalUploadRuntime: { shouldFinalizeFromUserTurn: async () => false }
  };
  globalThis.fetch = async () => new Response(
    'data: {"content":"A"}\n\ndata: {"content":" clear"}\n\ndata: {"content":" reply."}\n\ndata: [DONE]\n\n',
    {
      status: 200,
      headers: { "Content-Type": "text/event-stream" }
    }
  );

  try {
    await import(`../src/app/chatRuntime.js?single-commit-test=${Date.now()}`);
    const result = await window.MentalChatRuntime.sendConversation({
      arg: { text: "I want to talk about something difficult." },
      inputElement: null,
      appendMessage: () => ({}),
      updateBubble: ({ html }) => updates.push(html),
      parseHtml: (text) => text,
      recordUserTranscript: async () => ({}),
      recordAgentTranscript: async () => {},
      url: "/api/chat",
      botId: "bot",
      userId: "student",
      userName: "Test",
      logLabel: "Single commit test"
    });

    assert.equal(result, true);
    assert.deepEqual(updates, ["A clear reply."]);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("hidden automatic report update sends only the Agent payload and stops when it is unavailable", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const state = createTestState();
  const runtimeRoot = path.join(process.cwd(), "public");
  const requests = [];
  let prepareCalls = 0;

  globalThis.window = {
    __mentalImport: (specifier) => import(pathToFileURL(path.join(runtimeRoot, String(specifier).replace(/^\//, ""))).href),
    MentalSessionRuntime: { getState: () => state },
    MentalUploadRuntime: {
      prepareAutomaticReportUpdate: async (options) => {
        prepareCalls += 1;
        if (prepareCalls > 1) return null;
        assert.equal(options.trigger, "supplemental_scale_result");
        return {
          payload: { input: "background report update", Student_ID: "student" },
          audit: { payloadHash: "hash" }
        };
      }
    }
  };
  globalThis.fetch = async (_url, options = {}) => {
    requests.push(JSON.parse(options.body));
    return new Response("data: [DONE]\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" }
    });
  };

  try {
    await import(`../src/app/chatRuntime.js?hidden-report-test=${Date.now()}`);
    const first = await window.MentalChatRuntime.sendConversation({
      arg: { text: "Use the supplied Agent-internal payload.", hidden: true, silent: true },
      hidden: true,
      silent: true,
      automaticReportTrigger: "supplemental_scale_result",
      requireAutomaticReportPayload: true,
      url: "/api/chat",
      botId: "bot",
      userId: "student",
      userName: "Test"
    });
    const second = await window.MentalChatRuntime.sendConversation({
      arg: { text: "Use the supplied Agent-internal payload.", hidden: true, silent: true },
      hidden: true,
      silent: true,
      automaticReportTrigger: "supplemental_scale_result",
      requireAutomaticReportPayload: true,
      url: "/api/chat",
      botId: "bot",
      userId: "student",
      userName: "Test"
    });

    assert.equal(first, true);
    assert.equal(second, false);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].local_context_packet.agentInternalPayload.input, "background report update");
    assert.equal(requests[0].additional_messages[0].content, "Use the supplied Agent-internal payload.");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("supplemental assessment scores PHQ-9 and blocks incomplete submissions", () => {
  const service = createSupplementalAssessmentService();
  const incomplete = service.score("phq9", [0, 1]);
  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.error, "incomplete_answers");

  const complete = service.score("phq9", [0, 1, 2, 3, 0, 1, 2, 3, 1]);
  assert.equal(complete.ok, true);
  assert.equal(complete.result?.total, 13);
  assert.equal(complete.result?.interpretationKey, "moderate");
});

test("supplemental assessment scores GAD-7 with its source metadata", () => {
  const service = createSupplementalAssessmentService();
  const result = service.score("gad7", [3, 3, 3, 3, 3, 3, 3]);

  assert.equal(result.ok, true);
  assert.equal(result.result?.total, 21);
  assert.equal(result.result?.interpretationKey, "severe");
  assert.equal(result.result?.source.doi, "10.1001/archinte.166.10.1092");
});

test("conversation policy avoids asking a recently asked optional field again", () => {
  const state = createTestState();
  state.session.dialogueStage.currentTurn = 6;
  state.session.assessment.fields.functional_impact.status = "not_asked";
  state.session.assessment.fields.functional_impact.lastAskedTurn = 5;
  state.session.assessment.fields.risk_disclosure.status = "not_asked";
  state.safety.screeningStatus = "completed";

  const packet = createConversationContextService().buildConversationContextPacket(state);
  assert.ok(!packet.nextQuestionPriority.includes("functional_impact"));
  assert.ok(packet.conversationPolicy.recentAskedTopics.includes("functional_impact"));
});

test("conversation context does not queue optional fields after sufficient information", () => {
  const state = createTestState();
  state.session.assessment.fields.duration.status = "collected";
  state.session.assessment.fields.functional_impact.status = "collected";
  state.session.assessment.fields.risk_disclosure.status = "collected";
  state.safety.screeningStatus = "completed";

  const packet = createConversationContextService().buildConversationContextPacket(state);
  assert.equal(packet.conversationPolicy.responseMode, "respond");
  assert.deepEqual(packet.nextQuestionPriority, []);
  assert.ok(packet.missingFields.some((field) => field.key === "support_history"));
});

test("session snapshot restores transcript, upload hash and safety prompted status", () => {
  const service = createSessionSnapshotService(() => new Date("2026-07-28T10:00:00Z"));
  const state = createTestState();
  state.safety.screeningStatus = "prompted";
  state.upload.lastPayloadHash = "hash_for_restore_test";
  state.transcript.entries.push({
    id: "restore_agent_1",
    channel: "chat",
    role: "agent",
    content: "恢复测试",
    hidden: false,
    source: "agent_response",
    status: "final",
    createdAtIso: "2026-07-28T09:31:00Z",
    updatedAtIso: "2026-07-28T09:31:00Z"
  });

  const snapshot = service.exportSnapshot(state);
  const restored = service.parseSnapshot(snapshot, createTestState());

  assert.equal(snapshot.schemaVersion, "session_snapshot_v2");
  assert.equal(restored?.safety.screeningStatus, "prompted");
  assert.equal(restored?.upload.lastPayloadHash, "hash_for_restore_test");
  assert.ok(restored?.transcript.entries.some((entry) => entry.id === "restore_agent_1"));
});

test("report template avoids flooding gaps with not asked labels", () => {
  const service = createReportTemplateService();
  const gaps = service.renderInformationGaps({
    ...createTestState(),
    reportVersion: "cn_non_diagnostic_v1",
    generatedAt: "2026-07-28 09:22:00"
  });

  assert.ok(gaps.every((line) => !line.includes("未询问")));
});

test("report states that an unstarted safety screen is not a no-risk finding", () => {
  const report = createReportTemplateService().buildProfessionalReport({
    ...createTestState(),
    reportVersion: "cn_non_diagnostic_v1",
    generatedAt: "2026-07-31 09:00:00"
  });

  assert.ok(report.includes("\u672a\u5b8c\u6210\u5b89\u5168\u8be2\u95ee"));
  assert.ok(report.includes("\u4e0d\u80fd\u636e\u6b64\u63a8\u65ad\u4e0d\u5b58\u5728\u98ce\u9669"));
  assert.ok(report.includes("\u5f53\u524d\u4fe1\u606f\u4e0d\u8db3\u4ee5\u751f\u6210\u5177\u4f53\u8f6c\u4ecb\u5efa\u8bae"));
});

test("report payload uses Chinese non-diagnostic template and workflow field contract", () => {
  const state = createTestState();
  const payload = buildReportDraftPayload({
    ...state,
    reportVersion: "cn_non_diagnostic_v1",
    now: new Date("2026-07-28T09:22:00Z")
  });

  assert.ok(payload.REPORT_MARKDOWN.includes("心理健康对话初步评估报告"));
  assert.ok(payload.REPORT_MARKDOWN.includes("不构成医学诊断"));
  assert.equal(payload.STUDENT_ID, state.session.identity.userId);
  assert.equal(typeof payload.TIME, "string");
  assert.ok(!payload.REPORT_MARKDOWN.includes("Student Name"));

  const agentInput = toReportToFeishuInput(payload);
  assert.deepEqual(Object.keys(agentInput).sort(), ["SEVERITY_LEVEL", "Student_ID", "input", "time"]);
  assert.equal(agentInput.input, payload.REPORT_MARKDOWN);
  assert.equal(agentInput.Student_ID, payload.STUDENT_ID);
});

test("report payload keeps historical risk after current safety is cleared", () => {
  const safetyService = createSafetyRuleService();
  let safety = safetyService.evaluateText(cloneSafety(), "最近经常觉得想消失", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:09:00Z")
  }).nextStatus;
  safety = safetyService.evaluateText(safety, "没有。", {
    currentStage: "D7_safety_check",
    now: new Date("2026-07-28T09:10:00Z")
  }).nextStatus;

  const payload = buildReportDraftPayload({
    ...createTestState(),
    safety,
    reportVersion: "cn_non_diagnostic_v1",
    now: new Date("2026-07-28T09:22:00Z")
  });

  assert.equal(payload.SEVERITY_LEVEL, "needs_follow_up");
  assert.match(payload.REPORT_MARKDOWN, /当前安全摘要：当前对话未披露明确即时风险/);
  assert.match(payload.REPORT_MARKDOWN, /历史风险峰值：R1/);
  assert.match(payload.REPORT_MARKDOWN, /历史风险摘要：需要进一步确认/);
  assert.match(payload.REPORT_MARKDOWN, /想消失/);
});

test("conversation context packet exposes confirmed and missing fields", () => {
  const state = createTestState();
  const service = createConversationContextService();
  const packet = service.buildConversationContextPacket(state);

  assert.equal(packet.schemaVersion, "conversation_context_v1");
  assert.ok(packet.confirmedFields.some((field) => field.key === "duration"));
  assert.ok(packet.confirmedFields.some((field) => field.key === "sleep_appetite"));
  assert.ok(packet.missingFields.some((field) => field.key === "risk_disclosure"));
  assert.deepEqual(packet.nextQuestionPriority, []);
  assert.equal(packet.sourceOfTruth, "local_structured_state");
});

test("workflow payload validation rejects short or incomplete reports", () => {
  const service = createWorkflowPayloadService();
  const invalid = service.validatePayload({
    REPORT_MARKDOWN: "too short",
    SEVERITY_LEVEL: "not_assessed",
    STUDENT_ID: "",
    TIME: ""
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("report_too_short"));
  assert.ok(invalid.errors.includes("missing_student_id"));

  const valid = service.validatePayload(
    buildReportDraftPayload({
      ...createTestState(),
      reportVersion: "cn_non_diagnostic_v1",
      now: new Date("2026-07-28T09:22:00Z")
    })
  );
  assert.equal(valid.ok, true);
});

test("workflow service preserves payload hash and session id from gateway response", async () => {
  const payload = buildReportDraftPayload({
    ...createTestState(),
    reportVersion: "cn_non_diagnostic_v1",
    now: new Date("2026-07-28T09:22:00Z")
  });
  const service = createWorkflowService(async () =>
    new Response(
      JSON.stringify({
        run_id: "run_123",
        report_version: "cn_non_diagnostic_v1",
        mode: "agent_internal",
        audit_record_path: "server/workflow_audit/test.json",
        payload_hash: "abc123456789",
        session_id: "session_001",
        snapshot_received: true,
        snapshot_schema_version: "session_snapshot_v2"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    )
  );

  const result = await service.submit("/api/workflow/report-to-feishu", payload);
  assert.equal(result.ok, true);
  assert.equal(result.payloadHash, "abc123456789");
  assert.equal(result.sessionId, "session_001");
  assert.equal(result.gatewayMode, "agent_internal");
});

test("free chat boundary prevents field-driven follow-up while assessment remains automatic", () => {
  const interpreter = createTurnInterpretationService();
  const interactionService = createInteractionStateService();
  const planService = createResponsePlanningService();
  const state = createTestState();
  const interpretation = interpreter.interpret("\u5148\u522b\u5206\u6790\u6211\uff0c\u5c31\u968f\u4fbf\u804a\u804a\u5427");
  const interaction = interactionService.applyTurn(state.session.interaction, interpretation, state.safety);
  const plan = planService.build({ interaction, interpretation, safety: state.safety });

  assert.equal(interaction.mode, "free_chat");
  assert.equal(interaction.assessmentPermission, "allowed");
  assert.equal(plan.questionPermission, "natural_follow_up");
  assert.ok(plan.prohibitedMoves.includes("field_driven_question"));
});

test("free chat preference persists until the student explicitly resumes analysis", () => {
  const interpreter = createTurnInterpretationService();
  const interactionService = createInteractionStateService();
  const state = createTestState();
  const freeChat = interactionService.applyTurn(
    state.session.interaction,
    interpreter.interpret("\u5148\u522b\u5206\u6790\u6211\uff0c\u6211\u60f3\u804a\u804a\u548c\u5bb6\u4eba\u901a\u8bdd\u65f6\u7684\u62d6\u5ef6"),
    state.safety
  );
  const continued = interactionService.applyTurn(
    freeChat,
    interpreter.interpret("\u6bcf\u6b21\u770b\u5230\u6765\u7535\u90fd\u4f1a\u5f88\u7d27\u5f20"),
    state.safety
  );
  const resumed = interactionService.applyTurn(
    continued,
    interpreter.interpret("\u73b0\u5728\u53ef\u4ee5\u5206\u6790\u4e86"),
    state.safety
  );

  assert.equal(continued.mode, "free_chat");
  assert.equal(continued.questionPermission, "natural_follow_up");
  assert.equal(resumed.mode, "support");
  assert.ok(resumed.boundaries.some((boundary) => boundary.type === "no_assessment_question" && !boundary.active));
});

test("resume analysis clears a previous no-questions boundary", () => {
  const interpreter = createTurnInterpretationService();
  const interactionService = createInteractionStateService();
  const state = createTestState();
  const noQuestions = interactionService.applyTurn(
    state.session.interaction,
    interpreter.interpret("\u4e0d\u8981\u95ee\u4e86\uff0c\u6211\u60f3\u5148\u8bf4\u5b8c"),
    state.safety
  );
  const resumed = interactionService.applyTurn(
    noQuestions,
    interpreter.interpret("\u73b0\u5728\u53ef\u4ee5\u7ee7\u7eed\u5206\u6790\u4e86"),
    state.safety
  );

  assert.equal(noQuestions.questionPermission, "forbidden");
  assert.equal(resumed.questionPermission, "natural_follow_up");
  assert.ok(resumed.boundaries.some((boundary) => boundary.type === "no_questions" && !boundary.active));
});

test("ambiguous先这样 wording does not close a session", () => {
  const interpreter = createTurnInterpretationService();
  const ongoing = interpreter.interpret("\u4eca\u665a\u5148\u8fd9\u6837\u71ac\u8fc7\u53bb");
  const explicit = interpreter.interpret("\u4eca\u5929\u5148\u8fd9\u6837\u5427");
  const deferred = interpreter.interpret("\u4eca\u665a\u5148\u4e0d\u5206\u6790\uff0c\u5148\u71ac\u8fc7\u53bb");

  assert.notEqual(ongoing.intent, "closing");
  assert.equal(explicit.intent, "closing");
  assert.equal(deferred.boundaryAction, "free_chat");
});

test("third-party and quoted safety content are excluded from self-assessment extraction", () => {
  const interpreter = createTurnInterpretationService();
  const thirdParty = interpreter.interpret("\u5ba4\u53cb\u8bf4\u4ed6\u4e0d\u60f3\u6d3b\u4e86\uff0c\u4f46\u4e0d\u662f\u6211");
  const quoted = interpreter.interpret("\u5c0f\u8bf4\u91cc\u6709\u4eba\u8bf4\u4ed6\u60f3\u6d88\u5931");
  const selfExperience = interpreter.interpret("\u6211\u5f88\u6015\u5bb6\u4eba\u62c5\u5fc3\uff0c\u6240\u4ee5\u770b\u5230\u6765\u7535\u4f1a\u62d6\u5ef6");

  assert.equal(thirdParty.subject, "third_party");
  assert.equal(thirdParty.shouldExtractAssessmentEvidence, false);
  assert.equal(quoted.subject, "fictional");
  assert.equal(quoted.shouldExtractAssessmentEvidence, false);
  assert.equal(selfExperience.subject, "self");
  assert.equal(selfExperience.shouldExtractAssessmentEvidence, true);
});

test("subject routing distinguishes family dialogue, family impact, and third-party state", () => {
  const interpreter = createTurnInterpretationService();
  const familyDialogue = interpreter.interpret("\u548c\u5bb6\u4eba\u8bf4\u8bdd\u65f6\u6211\u5f88\u7d27\u5f20");
  const familyImpact = interpreter.interpret("\u5bb6\u4eba\u8ba9\u6211\u5f88\u7126\u8651");
  const familyState = interpreter.interpret("\u6211\u7684\u5bb6\u4eba\u6700\u8fd1\u5f88\u96be\u53d7");
  const quotedFamily = interpreter.interpret("\u5bb6\u4eba\u8bf4\u4ed6\u4e0d\u60f3\u6d3b\u4e86");
  const friendReport = interpreter.interpret("\u6211\u670b\u53cb\u8bf4\u6211\u4e0d\u60f3\u6d3b\u4e86");
  const hypothetical = interpreter.interpret("\u5982\u679c\u6211\u4e0d\u60f3\u6d3b\u4e86\u600e\u4e48\u529e");
  const quotedText = interpreter.interpret("\u201c\u6211\u4e0d\u60f3\u6d3b\u4e86\u201d\u8fd9\u662f\u522b\u4eba\u8bf4\u7684\u8bdd");

  assert.equal(familyDialogue.subject, "self");
  assert.equal(familyDialogue.shouldExtractAssessmentEvidence, true);
  assert.equal(familyImpact.subject, "self");
  assert.equal(familyImpact.shouldExtractAssessmentEvidence, true);
  assert.equal(familyState.subject, "third_party");
  assert.equal(familyState.shouldExtractAssessmentEvidence, false);
  assert.equal(quotedFamily.subject, "third_party");
  assert.equal(quotedFamily.shouldExtractAssessmentEvidence, false);
  assert.equal(friendReport.subject, "third_party");
  assert.equal(friendReport.shouldExtractAssessmentEvidence, false);
  assert.equal(hypothetical.subject, "hypothetical");
  assert.equal(hypothetical.shouldExtractAssessmentEvidence, false);
  assert.equal(quotedText.subject, "quoted");
  assert.equal(quotedText.shouldExtractAssessmentEvidence, false);
});

test("special student intents use direct local response plans instead of assessment collection", () => {
  const interpreter = createTurnInterpretationService();
  const interactionService = createInteractionStateService();
  const planService = createResponsePlanningService();
  const base = createTestState();

  const clarified = interpreter.interpret("\u6211\u6709\u65f6\u5019\u4f1a\u8bf4\u771f\u60f3\u6d88\u5931\u51e0\u5929\uff0c\u53ea\u662f\u60f3\u8eb2\u8d77\u6765\uff0c\u4e0d\u662f\u771f\u7684\u60f3\u4f24\u5bb3\u81ea\u5df1");
  const decision = interpreter.interpret("\u50cf\u6211\u8fd9\u6837\u662f\u4e0d\u662f\u5e94\u8be5\u53bb\u770b\u5fc3\u7406\u533b\u751f\uff1f");
  const peer = interpreter.interpret("\u4e0d\u662f\u6211\uff0c\u662f\u6211\u5ba4\u53cb\uff0c\u6211\u4e0d\u77e5\u9053\u8be5\u4e0d\u8be5\u529d\u5979\u53bb\u770b\u770b");
  const creative = interpreter.interpret("\u6211\u5728\u5199\u4e00\u6bb5\u5c0f\u8bf4\uff0c\u89d2\u8272\u8bf4\u2018\u6211\u4e0d\u60f3\u6d3b\u4e86\u2019\uff0c\u8fd9\u53e5\u8bdd\u600e\u4e48\u5199\u624d\u81ea\u7136\uff1f");
  const medical = interpreter.interpret("\u6700\u8fd1\u4e00\u5468\u603b\u662f\u5fc3\u614c\u3001\u80f8\u53e3\u53d1\u95f7\uff0c\u4eca\u5929\u8fd8\u5934\u6655\u4e86\u4e00\u4e0b");

  assert.equal(clarified.intent, "risk_clarification");
  assert.equal(clarified.safetySignal, "explicitly_denied");
  assert.equal(decision.intent, "support_decision_question");
  assert.equal(peer.subject, "third_party");
  assert.equal(peer.intent, "third_party_support");
  assert.equal(creative.subject, "fictional");
  assert.equal(creative.intent, "creative_request");
  assert.equal(medical.intent, "medical_concern");

  const decisionInteraction = interactionService.applyTurn(base.session.interaction, decision, base.safety);
  const decisionPlan = planService.build({ interaction: decisionInteraction, safety: base.safety });
  const medicalInteraction = interactionService.applyTurn(base.session.interaction, medical, base.safety);
  const medicalPlan = planService.build({ interaction: medicalInteraction, safety: base.safety });

  assert.equal(decisionPlan.responseGoal, "answer_directly");
  assert.equal(decisionPlan.questionPermission, "forbidden");
  assert.equal(medicalPlan.responseGoal, "safety");
  assert.equal(medicalPlan.allowedQuestionGoal, "immediate_medical_safety");
});

test("response planning stops immediate safety repetition after a current-safe clarification", () => {
  const planService = createResponsePlanningService();
  const state = createTestState();
  const safety = {
    ...cloneSafety(),
    summary: "needs_follow_up",
    workflowLabel: "R1",
    peakSummary: "needs_follow_up",
    peakWorkflowLabel: "R1",
    safetyConfirmation: "confirmed_safe",
    screeningStatus: "completed",
    resourceNoticeNeeded: true
  };
  const plan = planService.build({
    interaction: {
      ...state.session.interaction,
      mode: "support",
      questionPermission: "natural_follow_up"
    },
    safety
  });

  assert.equal(plan.responseGoal, "support");
  assert.equal(plan.allowedQuestionGoal, "current_topic_only");
  assert.notEqual(plan.allowedQuestionGoal, "immediate_safety");
});

test("conversation context carries ordered dialogue and a response plan without field tasks in free chat", () => {
  const state = createTestState();
  state.session.interaction = {
    ...state.session.interaction,
    mode: "free_chat",
    questionPermission: "natural_follow_up"
  };
  state.transcript.entries.push({
    id: "agent_turn_context_1",
    channel: "chat",
    role: "agent",
    content: "\u6211\u5728\u542c\u3002",
    hidden: false,
    source: "agent_response",
    status: "final",
    createdAtIso: "2026-07-30T10:01:00Z",
    updatedAtIso: "2026-07-30T10:01:00Z"
  });

  const packet = createConversationContextService().buildConversationContextPacket(state);
  assert.equal(packet.interaction.mode, "free_chat");
  assert.equal(packet.responsePlan.questionPermission, "natural_follow_up");
  assert.deepEqual(packet.nextQuestionPriority, []);
  assert.equal(packet.conversationPolicy.targetField, undefined);
  assert.equal(packet.recentDialogueTurns.at(-1)?.role, "agent");
});

test("report auto-update coordinator dispatches new evidence once and allows a final forced update", () => {
  const coordinator = createReportAutoUpdateCoordinator();
  const state = createTestState();
  const first = coordinator.decide({
    state,
    trigger: "meaningful_self_evidence",
    fingerprint: "evidence_v1"
  });
  const duplicate = coordinator.decide({
    state: { ...state, upload: { ...state.upload, lastReportFingerprint: "evidence_v1" } },
    trigger: "meaningful_self_evidence",
    fingerprint: "evidence_v1"
  });
  const final = coordinator.decide({
    state: { ...state, upload: { ...state.upload, lastReportFingerprint: "evidence_v1" } },
    trigger: "session_end",
    fingerprint: "evidence_v1"
  });

  assert.equal(first.shouldDispatch, true);
  assert.equal(first.kind, "create");
  assert.equal(duplicate.shouldDispatch, false);
  assert.equal(duplicate.reason, "unchanged_payload");
  assert.equal(final.shouldDispatch, true);
  assert.equal(final.kind, "final_update");
});

test("browser session runtime only requests automatic reporting after assessment state changes", async () => {
  const originalWindow = globalThis.window;
  const storage = new Map();
  const runtimeRoot = path.join(process.cwd(), "public");
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    __mentalImport: (specifier) => import(pathToFileURL(path.join(runtimeRoot, String(specifier).replace(/^\//, ""))).href)
  };

  try {
    await import(`../src/app/sessionRuntime.js?runtime-test=${Date.now()}`);
    await window.MentalSessionRuntime.init({ activeView: "chat" });
    await window.MentalSessionRuntime.setIdentity({ userId: "20260001", userName: "Test", synthetic: false });

    const casual = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u4eca\u5929\u5929\u6c14\u4e0d\u9519",
      source: "user_input"
    });
    const meaningful = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u6700\u8fd1\u8bba\u6587\u538b\u529b\u5f88\u5927\uff0c\u665a\u4e0a\u7761\u4e0d\u7740",
      source: "user_input"
    });

    assert.equal(casual.reportTrigger, undefined);
    assert.equal(meaningful.reportTrigger, "meaningful_self_evidence");

    await window.MentalSessionRuntime.updateSafety({
      screeningStatus: "completed",
      summary: "no_immediate_risk_disclosed",
      workflowLabel: "R0"
    });
    const riskEvidenceBeforeCasualTurn = window.MentalSessionRuntime
      .getState().session.assessment.fields.risk_disclosure.evidence.length;
    const postSafetyCasual = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u4eca\u5929\u5929\u6c14\u4e0d\u9519",
      source: "user_input"
    });

    assert.equal(postSafetyCasual.reportTrigger, undefined);
    assert.equal(
      window.MentalSessionRuntime.getState().session.assessment.fields.risk_disclosure.evidence.length,
      riskEvidenceBeforeCasualTurn
    );

    await window.MentalSessionRuntime.updateSafety({
      screeningStatus: "prompted",
      summary: "not_asked",
      workflowLabel: "R0"
    });
    const clearDenial = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u4e0d\u662f\u60f3\u4f24\u5bb3\u81ea\u5df1",
      source: "user_input"
    });
    assert.equal(clearDenial.reportTrigger, "safety_change");
    assert.equal(window.MentalSessionRuntime.getState().safety.screeningStatus, "completed");
    assert.equal(window.MentalSessionRuntime.getState().safety.summary, "no_immediate_risk_disclosed");

    await window.MentalSessionRuntime.updateSafety({
      screeningStatus: "prompted",
      summary: "not_asked",
      workflowLabel: "R0"
    });
    const ambiguousClarification = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u53ea\u662f\u60f3\u8eb2\u8d77\u6765",
      source: "user_input"
    });
    assert.equal(ambiguousClarification.reportTrigger, "safety_change");
    assert.equal(window.MentalSessionRuntime.getState().safety.screeningStatus, "completed");
    assert.equal(window.MentalSessionRuntime.getState().safety.summary, "needs_follow_up");
    assert.equal(window.MentalSessionRuntime.getState().safety.workflowLabel, "R1");
  } finally {
    globalThis.window = originalWindow;
  }
});

test("automatic report update submits the hidden Agent payload through the local gateway", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const storage = new Map();
  const runtimeRoot = path.join(process.cwd(), "public");
  const calls = [];
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    __mentalImport: (specifier) => import(pathToFileURL(path.join(runtimeRoot, String(specifier).replace(/^\//, ""))).href)
  };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/api/workflow/status")) {
      return new Response(JSON.stringify({ enabled: true, mode: "agent_internal", workflow: "report-to-feishu-yhx" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      run_id: "run_auto_1",
      report_version: "cn_non_diagnostic_v1",
      mode: "agent_internal",
      audit_record_path: "server/workflow_audit/auto.json",
      payload_hash: "hash_auto_1",
      session_id: "session_auto_1",
      snapshot_received: true,
      snapshot_schema_version: "session_snapshot_v2"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    await import(`../src/app/sessionRuntime.js?automatic-report-test=${Date.now()}`);
    await import(`../src/app/reportDraftRuntime.js?automatic-report-test=${Date.now()}`);
    await import(`../src/app/uploadRuntime.js?automatic-report-test=${Date.now()}`);
    await window.MentalSessionRuntime.init({ activeView: "chat" });
    await window.MentalSessionRuntime.setIdentity({ userId: "20260002", userName: "Test", synthetic: false });
    const turn = await window.MentalSessionRuntime.ingestUserTurn({
      channel: "chat",
      role: "user",
      content: "\u6700\u8fd1\u8bba\u6587\u538b\u529b\u5f88\u5927\uff0c\u665a\u4e0a\u7761\u4e0d\u7740\uff0c\u5df2\u7ecf\u5f71\u54cd\u4e0a\u8bfe\u4e86",
      source: "user_input"
    });

    const update = await window.MentalUploadRuntime.prepareAutomaticReportUpdate({
      trigger: turn.reportTrigger,
      gatewayUrl: "/api/workflow/report-to-feishu",
      statusUrl: "/api/workflow/status"
    });

    assert.equal(turn.reportTrigger, "meaningful_self_evidence");
    assert.ok(update?.payload?.input.includes("心理健康"));
    assert.equal(update.payload.SEVERITY_LEVEL, "not_assessed");
    assert.equal(update.payload.Student_ID, "20260002");
    assert.equal(update.audit.payloadHash, "hash_auto_1");
    assert.equal(calls.filter((call) => call.url.includes("/api/workflow/report-to-feishu")).length, 1);
    assert.equal(window.MentalSessionRuntime.getState().upload.reportDispatchCount, 1);

    const finalPayload = await window.MentalUploadRuntime.prepareAgentInternalPayload({
      gatewayUrl: "/api/workflow/report-to-feishu",
      statusUrl: "/api/workflow/status"
    });
    const callCountAfterFinal = calls.filter((call) => call.url.includes("/api/workflow/report-to-feishu")).length;
    const duplicateFinalPayload = await window.MentalUploadRuntime.prepareAgentInternalPayload({
      gatewayUrl: "/api/workflow/report-to-feishu",
      statusUrl: "/api/workflow/status"
    });

    assert.ok(finalPayload?.payload?.input);
    assert.equal(duplicateFinalPayload, null);
    assert.equal(calls.filter((call) => call.url.includes("/api/workflow/report-to-feishu")).length, callCountAfterFinal);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
