import type { Finding, ServerSnapshot } from "../types.js";
/**
 * Token rules need async counting, so they run through a dedicated
 * async checker instead of the sync Rule interface.
 */
export interface TokenBudget {
    totalBudget: number;
    perToolBudget: number;
    maxTools: number;
    sprawlTools: number;
}
export declare const DEFAULT_BUDGET: TokenBudget;
export declare function checkTokenRules(s: ServerSnapshot, budget?: TokenBudget): Promise<Finding[]>;
/**
 * T005: many tools and no code or batch tool. Every capability is then its own tool, paid for
 * on every request. It replaces T004 (one defect, one charge), and its fix includes T004's.
 */
export declare function checkSprawl(s: ServerSnapshot, roles: {
    code: string[];
    batch: string[];
}, findings: Finding[], budget?: TokenBudget): Finding[];
/** What the whole tool list costs on every request, as T001 counts it. */
export declare function catalogTokens(s: ServerSnapshot): Promise<number>;
