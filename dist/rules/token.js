import { countToolTokens } from "../tokens.js";
export const DEFAULT_BUDGET = {
    totalBudget: 8000,
    perToolBudget: 1200,
    maxTools: 25,
    sprawlTools: 15,
};
export async function checkTokenRules(s, budget = DEFAULT_BUDGET) {
    const out = [];
    let total = 0;
    for (const t of s.tools) {
        const n = await countToolTokens(t);
        total += n;
        if (n > budget.perToolBudget) {
            out.push({
                ruleId: "T002", severity: "warn", category: "token", toolName: t.name,
                message: `"${t.name}" costs ~${n} tokens in every request (budget: ${budget.perToolBudget}).`,
                fix: "Trim the description, flatten the schema, drop redundant boilerplate.",
            });
        }
    }
    if (total > budget.totalBudget) {
        out.push({
            ruleId: "T001", severity: "error", category: "token",
            message: `The full tool catalog costs ~${total} tokens per request (budget: ${budget.totalBudget}). Agents pay this on every single call.`,
            fix: "Reduce tool count, tighten descriptions, or split the server by domain.",
        });
    }
    // T003: repeated boilerplate — same long prefix across ≥3 descriptions
    const prefixCount = new Map();
    for (const t of s.tools) {
        const d = (t.description ?? "").trim().toLowerCase();
        if (d.length < 40)
            continue;
        const prefix = d.slice(0, 40);
        prefixCount.set(prefix, [...(prefixCount.get(prefix) ?? []), t.name]);
    }
    for (const [, names] of prefixCount) {
        if (names.length >= 3) {
            out.push({
                ruleId: "T003", severity: "warn", category: "token",
                message: `${names.length} tools share the same 40+ char description preamble (${names.slice(0, 3).join(", ")}…) — boilerplate multiplies token cost with zero information.`,
                fix: "Strip the shared preamble; put shared context once in the server description.",
            });
            break; // one finding is enough to make the point
        }
    }
    if (s.tools.length > budget.maxTools) {
        out.push({
            ruleId: "T004", severity: "info", category: "token",
            message: `${s.tools.length} tools in one server (suggested max: ${budget.maxTools}). Big catalogs dilute tool selection accuracy.`,
            fix: "Split into multiple focused servers, or gate rarely-used tools behind a mode flag.",
        });
    }
    return out;
}
/**
 * T005: many tools and no code or batch tool. Every capability is then its own tool, paid for
 * on every request. It replaces T004 (one defect, one charge), and its fix includes T004's.
 */
export function checkSprawl(s, roles, findings, budget = DEFAULT_BUDGET) {
    if (s.tools.length < budget.sprawlTools || roles.code.length || roles.batch.length) {
        return findings;
    }
    return [
        ...findings.filter((f) => f.ruleId !== "T004"),
        {
            ruleId: "T005", severity: "info", category: "token",
            message: `${s.tools.length} tools and no code or batch tool: every capability is its own tool, paid for on every request, and multi-step work takes one call per step.`,
            fix: "Expose the API to a code tool (or a batch tool) plus a search tool, keeping only entry points as tools; or split the server by domain.",
        },
    ];
}
/** What the whole tool list costs on every request, as T001 counts it. */
export async function catalogTokens(s) {
    let total = 0;
    for (const t of s.tools) {
        total += await countToolTokens(t);
    }
    return total;
}
