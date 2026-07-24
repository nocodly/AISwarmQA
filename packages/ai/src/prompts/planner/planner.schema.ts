import type { PlannerInput } from "@ai-swarm-qa/shared";

export type PromptDefinition<TInput = PlannerInput> = {
  id: string;
  version: string;
  purpose: string;
  modelRole: string;
  buildSystemPrompt: () => string;
  buildUserPrompt: (input: TInput) => string;
};
