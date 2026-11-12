import type { ToolDef } from "../types.js";
/**
 * Below this a pair is not a plausible twin, and the server gets no near-twin
 * task for it (a catalog of clearly distinct tools has none, which is honest).
 * Uncalibrated: chosen by fixtures, revisit against real leaderboard catalogs.
 */
export declare const TWIN_FLOOR = 0.3;
/** The `limit` most confusable tool-name pairs, most confusable first. */
export declare function findTwinPairs(tools: ToolDef[], limit: number): [string, string][];
