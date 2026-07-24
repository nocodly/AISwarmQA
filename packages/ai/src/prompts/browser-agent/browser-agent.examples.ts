import type { BrowserAgentAction } from "@ai-swarm-qa/shared";

export const browserAgentPromptExamples: BrowserAgentAction[] = [
  { tool: "inspect", reason: "Establish the current visible state before interacting." },
  { tool: "click", targetId: "element-1", reason: "Open a safe same-origin product detail control." },
  { tool: "fill", targetId: "element-2", valueKind: "synthetic-search", reason: "Test a safe non-sensitive search field." },
  { tool: "report_finding", reason: "A visible stalled state is supported by recent evidence.", finding: {
    title: "Safe demo control does not progress",
    description: "The demo control produced a visible stalled state instead of continuing.",
    category: "functional",
    severity: "medium",
    evidenceStepIds: ["step-3"]
  } },
  { tool: "finish", summary: "Exploration completed within safety budgets.", reason: "No further safe progress is available." }
];
