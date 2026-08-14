export const DIALOGUE_STAGE_CODES = [
    "D0_session_init",
    "D1_boundary_notice",
    "D2_open_concern",
    "D3_concern_detail",
    "D4_campus_context",
    "D5_state_review",
    "D6_functional_impact",
    "D7_safety_check",
    "D8_scale_or_supplement",
    "D9_support_history",
    "D10_summary_confirm",
    "D11_feedback_next_step",
    "D12_report_upload",
    "C1_risk_clarify",
    "C2_risk_assess",
    "C3_support_connect",
    "C4_emergency_disposition",
    "C5_crisis_handoff"
];
const STAGE_METADATA = {
    D0_session_init: {
        code: "D0_session_init",
        label: "D0 会话初始化",
        taskStatus: "in_progress",
        nextAction: "wait_for_session_ready",
        crisisStage: false
    },
    D1_boundary_notice: {
        code: "D1_boundary_notice",
        label: "D1 边界与知情说明",
        taskStatus: "in_progress",
        nextAction: "present_boundary_notice",
        crisisStage: false
    },
    D2_open_concern: {
        code: "D2_open_concern",
        label: "D2 开放式主诉",
        taskStatus: "in_progress",
        nextAction: "collect_open_concern",
        crisisStage: false
    },
    D3_concern_detail: {
        code: "D3_concern_detail",
        label: "D3 主诉具体化",
        taskStatus: "in_progress",
        nextAction: "clarify_concern_details",
        crisisStage: false
    },
    D4_campus_context: {
        code: "D4_campus_context",
        label: "D4 校园与生活情境",
        taskStatus: "in_progress",
        nextAction: "collect_context",
        crisisStage: false
    },
    D5_state_review: {
        code: "D5_state_review",
        label: "D5 情绪认知行为身体状态",
        taskStatus: "in_progress",
        nextAction: "review_psychological_state",
        crisisStage: false
    },
    D6_functional_impact: {
        code: "D6_functional_impact",
        label: "D6 功能影响",
        taskStatus: "in_progress",
        nextAction: "confirm_functional_impact",
        crisisStage: false
    },
    D7_safety_check: {
        code: "D7_safety_check",
        label: "D7 固定安全确认",
        taskStatus: "in_progress",
        nextAction: "run_safety_check",
        crisisStage: false
    },
    D8_scale_or_supplement: {
        code: "D8_scale_or_supplement",
        label: "D8 按需量表或补充评估",
        taskStatus: "in_progress",
        nextAction: "consider_scale_or_supplement",
        crisisStage: false
    },
    D9_support_history: {
        code: "D9_support_history",
        label: "D9 支持系统与既往求助",
        taskStatus: "in_progress",
        nextAction: "review_support_history",
        crisisStage: false
    },
    D10_summary_confirm: {
        code: "D10_summary_confirm",
        label: "D10 总结确认",
        taskStatus: "in_progress",
        nextAction: "summarize_for_confirmation",
        crisisStage: false
    },
    D11_feedback_next_step: {
        code: "D11_feedback_next_step",
        label: "D11 反馈与下一步建议",
        taskStatus: "in_progress",
        nextAction: "offer_next_step_feedback",
        crisisStage: false
    },
    D12_report_upload: {
        code: "D12_report_upload",
        label: "D12 报告生成与上传",
        taskStatus: "done",
        nextAction: "generate_backend_report",
        crisisStage: false
    },
    C1_risk_clarify: {
        code: "C1_risk_clarify",
        label: "C1 风险澄清",
        taskStatus: "blocked",
        nextAction: "clarify_risk_signal",
        crisisStage: true
    },
    C2_risk_assess: {
        code: "C2_risk_assess",
        label: "C2 风险要素评估",
        taskStatus: "blocked",
        nextAction: "assess_risk_dimensions",
        crisisStage: true
    },
    C3_support_connect: {
        code: "C3_support_connect",
        label: "C3 现实支持连接",
        taskStatus: "blocked",
        nextAction: "connect_real_world_support",
        crisisStage: true
    },
    C4_emergency_disposition: {
        code: "C4_emergency_disposition",
        label: "C4 高度关注/紧急处置",
        taskStatus: "blocked",
        nextAction: "recommend_emergency_help",
        crisisStage: true
    },
    C5_crisis_handoff: {
        code: "C5_crisis_handoff",
        label: "C5 危机记录与交接",
        taskStatus: "done",
        nextAction: "record_crisis_handoff",
        crisisStage: true
    }
};
export function getDialogueStageMetadata(code) {
    return STAGE_METADATA[code];
}
export function createInitialDialogueStageState(now = new Date()) {
    return {
        currentStage: "D0_session_init",
        completedStages: [],
        currentTurn: 0,
        lastUpdatedAtIso: now.toISOString(),
        lastEventType: "session_created",
        nextAction: STAGE_METADATA.D0_session_init.nextAction,
        lastReason: "Session created."
    };
}
export function getDialogueStageLabel(code) {
    return STAGE_METADATA[code].label;
}
