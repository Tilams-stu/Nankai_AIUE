export const initialUploadStatus = {
    reportStatus: "draft",
    userVisibleStatus: "not_started"
};
export function toUserVisibleUploadStatus(reportStatus) {
    switch (reportStatus) {
        case "pending_review":
            return "processing";
        case "uploaded":
            return "submitted_pending_confirmation";
        case "upload_failed":
        case "validation_failed":
        case "returned":
            return "failed_needs_investigation";
        default:
            return "not_started";
    }
}
export function toUploadStatusLabel(status) {
    switch (status) {
        case "not_started":
            return "未开始";
        case "processing":
            return "处理中";
        case "submitted_pending_confirmation":
            return "已提交待确认";
        case "failed_needs_investigation":
            return "失败待排查";
        default:
            return "未开始";
    }
}
