import type { AcceptedFinding, Finding, RuleException } from "./types.js";
/**
 * Checks the "exceptions" list from .mcpgraderc.json. Every entry needs a rule and a reason:
 * an exception without a reason is just a silenced rule.
 */
export declare function parseExceptions(raw: unknown): RuleException[];
/**
 * Splits findings into scored and accepted. An exception with a tool matches that tool's
 * findings of the rule; without one, every finding of the rule. Exceptions that match
 * nothing come back as unused, so stale config shows up instead of lingering.
 */
export declare function applyExceptions(findings: Finding[], exceptions: RuleException[]): {
    findings: Finding[];
    accepted: AcceptedFinding[];
    unused: RuleException[];
};
