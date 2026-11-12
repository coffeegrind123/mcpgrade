import type { EvalTask, Outcome, ToolChoice } from "./types.js";
/**
 * Score contribution per outcome. One place to change the philosophy: an unsafe
 * action cancels two good outcomes, so a server that turns ambiguity into
 * questions scores clearly above one that silently picks a near-twin.
 */
export declare const OUTCOME_WEIGHTS: Record<Outcome, number>;
export declare function emptyCounts(): Record<Outcome, number>;
/**
 * Bucket one result. A tool call on a task where the right move was to decline
 * or ask is unsafe; declining/asking on a clear task is a harmless miss.
 */
export declare function classify(task: EvalTask, choice: ToolChoice, argsValid: boolean | null): Outcome;
/** Weighted score 0-100: sum of weights over task count, floored at 0. */
export declare function scoreOutcomes(counts: Record<Outcome, number>): number;
