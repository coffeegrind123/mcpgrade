import type { Finding, ServerSnapshot } from "./types.js";
/**
 * C003 — live probe: call tools with deliberately invalid arguments (an empty
 * object where required params exist) and grade the error message quality.
 * A correct server rejects at schema validation, so no side effects occur.
 *
 * Safety: opt-in via --probe. Only tools with ≥1 required param are probed
 * (sending {} to an all-optional tool could trigger a real execution).
 */
/** Is this error message actionable for a model — does it say WHAT is wrong? */
export declare function isActionableError(message: string, requiredParams: string[]): boolean;
export interface ProbeCaller {
    callTool(name: string, args: Record<string, unknown>): Promise<{
        isError?: boolean;
        text: string;
    }>;
    close(): Promise<void>;
}
export declare function makeStdioCaller(command: string): Promise<ProbeCaller>;
export declare function runProbe(snapshot: ServerSnapshot, caller: ProbeCaller, limit?: number): Promise<Finding[]>;
