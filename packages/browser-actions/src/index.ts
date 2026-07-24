import { z } from "zod";

export const browserActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("goto"), url: z.string().url(), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("click"), selector: z.string().min(1), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("fill"), selector: z.string().min(1), value: z.string(), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("screenshot"), label: z.string().min(1) }),
  z.object({ type: z.literal("waitForNetworkIdle"), timeoutMs: z.number().int().positive() })
]);

export type BrowserAction = z.infer<typeof browserActionSchema>;

export const missionPlanSchema = z.object({
  role: z.string().min(1),
  objective: z.string().min(1),
  actions: z.array(browserActionSchema).min(1),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })
});

export type MissionPlan = z.infer<typeof missionPlanSchema>;

