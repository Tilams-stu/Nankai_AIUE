export const REPORT_TO_FEISHU_FIELD_MAP = {
    input: "REPORT_MARKDOWN",
    SEVERITY_LEVEL: "SEVERITY_LEVEL",
    Student_ID: "STUDENT_ID",
    time: "TIME"
};
export function toReportToFeishuInput(payload) {
    return {
        input: payload.REPORT_MARKDOWN,
        SEVERITY_LEVEL: payload.SEVERITY_LEVEL,
        Student_ID: payload.STUDENT_ID,
        time: payload.TIME
    };
}
export function toGatewayReportSubmission(payload, sessionSnapshot) {
    return {
        ...toReportToFeishuInput(payload),
        ...(sessionSnapshot ? { session_snapshot: sessionSnapshot } : {})
    };
}
