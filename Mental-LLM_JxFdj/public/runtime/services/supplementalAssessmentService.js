const FREQUENCY_OPTIONS = ["完全没有", "有几天", "一半以上的天数", "几乎每天"];
const DEFINITIONS = [
    {
        id: "phq9",
        name: "PHQ-9 抑郁症状筛查量表",
        description: "用于了解近两周的抑郁相关症状体验。结果仅作筛查参考，不构成诊断。",
        recallPeriod: "过去两周",
        questions: [
            "做事时提不起劲或没有兴趣",
            "感到心情低落、沮丧或绝望",
            "入睡困难、睡不安稳或睡眠过多",
            "感觉疲倦或没有活力",
            "食欲不振或吃得过多",
            "觉得自己很糟，或觉得自己让自己或家人失望",
            "对事物专注有困难，例如阅读报纸或看电视时",
            "动作或说话速度缓慢到别人注意到；或相反，烦躁、坐立不安而动得比平常多",
            "有不如死掉或用某种方式伤害自己的想法"
        ],
        options: FREQUENCY_OPTIONS,
        source: {
            name: "PHQ-9",
            citation: "Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001.",
            doi: "10.1046/j.1525-1497.2001.016009606.x",
            officialUrl: "https://www.phqscreeners.com/select-screener",
            version: "PHQ-9 / Chinese wording pending release review"
        }
    },
    {
        id: "gad7",
        name: "GAD-7 广泛性焦虑症状筛查量表",
        description: "用于了解近两周的焦虑相关症状体验。结果仅作筛查参考，不构成诊断。",
        recallPeriod: "过去两周",
        questions: [
            "感到紧张、焦虑或急切不安",
            "不能停止或难以控制担忧",
            "对各种各样的事情担忧过多",
            "很难放松下来",
            "由于不安而难以静坐",
            "变得容易烦恼或急躁",
            "感到似乎将有可怕的事情发生而害怕"
        ],
        options: FREQUENCY_OPTIONS,
        source: {
            name: "GAD-7",
            citation: "Spitzer RL, Kroenke K, Williams JBW, Lowe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006.",
            doi: "10.1001/archinte.166.10.1092",
            officialUrl: "https://www.phqscreeners.com/select-screener",
            version: "GAD-7 / Chinese wording pending release review"
        }
    }
];
function interpretation(id, total) {
    if (id === "phq9") {
        if (total <= 4)
            return { key: "minimal", label: "症状体验较少" };
        if (total <= 9)
            return { key: "mild", label: "轻度症状体验" };
        if (total <= 14)
            return { key: "moderate", label: "中度症状体验" };
        if (total <= 19)
            return { key: "moderately_severe", label: "中重度症状体验" };
        return { key: "severe", label: "较多症状体验" };
    }
    if (total <= 4)
        return { key: "minimal", label: "症状体验较少" };
    if (total <= 9)
        return { key: "mild", label: "轻度症状体验" };
    if (total <= 14)
        return { key: "moderate", label: "中度症状体验" };
    return { key: "severe", label: "较多症状体验" };
}
export function createSupplementalAssessmentService() {
    return {
        list() {
            return DEFINITIONS.map((definition) => ({ ...definition, questions: [...definition.questions], options: [...definition.options] }));
        },
        get(id) {
            const definition = DEFINITIONS.find((item) => item.id === id);
            return definition ? { ...definition, questions: [...definition.questions], options: [...definition.options] } : undefined;
        },
        score(id, answers) {
            const definition = DEFINITIONS.find((item) => item.id === id);
            if (!definition)
                return { ok: false, error: "unknown_assessment" };
            if (answers.length !== definition.questions.length || answers.some((answer) => answer === undefined || answer === null)) {
                return { ok: false, error: "incomplete_answers" };
            }
            if (answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
                return { ok: false, error: "invalid_answer" };
            }
            const total = answers.reduce((sum, answer) => sum + answer, 0);
            const level = interpretation(id, total);
            const requiresSafetyFollowUp = id === "phq9" && answers[8] > 0;
            return {
                ok: true,
                result: {
                    assessmentId: id,
                    assessmentName: definition.name,
                    total,
                    maximum: definition.questions.length * 3,
                    interpretationKey: level.key,
                    interpretationLabel: level.label,
                    source: definition.source,
                    requiresSafetyFollowUp,
                    reportSummary: `${definition.name}（${definition.recallPeriod}）总分 ${total}/${definition.questions.length * 3}；${level.label}；仅作筛查参考，不构成诊断。`
                }
            };
        }
    };
}
