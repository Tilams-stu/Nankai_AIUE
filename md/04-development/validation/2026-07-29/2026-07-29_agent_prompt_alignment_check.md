# Agent Prompt Alignment Check - 2026-07-29

## Scope

This check records the rewrite of the active agent prompt into a version aligned with the current program and design documents:

- `D:\Desktop\Software\AIUE\files\智能体提示词.md`

## Implementation Result

- Removed the older student-facing screening-helper phrasing, mixed score-oriented flow, and overly counselor-like role framing.
- Replaced them with one single prompt version aligned to the current project architecture:
  - role is `高校心理健康无感知测评对话助手`
  - non-diagnostic boundary is explicit
  - natural dialogue is primary and scales are supplemental only
  - internal flow is aligned to `D1-D12` plus crisis `C1-C5`
  - structured fields are aligned to the current assessment state design
  - backend-only report generation and silent upload boundary are explicit
  - workflow target is `report-to-feishu`

## Alignment Notes

The rewritten prompt now matches the current documented project path:

- student-side natural dialogue
- structured follow-up with field status discipline
- fixed safety confirmation plus crisis routing
- backend-only report generation
- agent-internal `report-to-feishu`
- Feishu archive

## Residual Risk

- The actual NK-GeniOS Agent still needs to be updated in the platform UI with this rewritten prompt before live workflow behavior can be considered aligned.
- This repository check validates prompt/document alignment only; it does not prove that the live Agent already uses the same prompt or that Feishu upload behavior has been externally re-verified.
