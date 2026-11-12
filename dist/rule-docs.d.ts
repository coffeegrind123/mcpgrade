/**
 * Rule documentation — single source of truth shared by the `rules` command
 * and MCP serve mode. Generated from docs/rules.md by scripts/gen-rule-docs.mjs.
 * Do not edit by hand.
 */
export interface RuleDoc {
    title: string;
    severity: "error" | "warn" | "info";
    category: "descriptions" | "naming" | "schema" | "token-cost" | "consistency" | "programmability";
    /** Why this degrades agent behaviour. */
    why: string;
    /** Concrete remedy, with examples where the docs provide them. */
    fix: string | null;
}
export declare const RULE_DOCS: Record<string, RuleDoc>;
