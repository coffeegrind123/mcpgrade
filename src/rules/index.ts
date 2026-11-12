import type { Finding, Rule, ServerSnapshot } from "../types.js";
import { descRules } from "./desc.js";
import { nameRules } from "./name.js";
import { schemaRules } from "./schema.js";
import { consistRules } from "./consist.js";
import { serverRules } from "./server.js";
import { checkTokenRules, DEFAULT_BUDGET, type TokenBudget } from "./token.js";

export const staticRules: Rule[] = [...descRules, ...nameRules, ...schemaRules, ...consistRules, ...serverRules];

/**
 * One defect, one charge (issue #9): a parameter with no description at all (D004) is not
 * also charged for having no example (S008). D004's fix already asks for an example.
 */
function dropOverlaps(findings: Finding[]): Finding[] {
  const undescribed = new Set(
    findings.filter((f) => f.ruleId === "D004" && f.param !== undefined).map((f) => `${f.toolName}\u0000${f.param}`),
  );
  return findings.filter((f) => f.ruleId !== "S008" || !undescribed.has(`${f.toolName}\u0000${f.param}`));
}

export interface LintOptions {
  disabledRules?: string[];
  tokenBudget?: Partial<TokenBudget>;
}

export async function runRules(
  snapshot: ServerSnapshot,
  opts: LintOptions = {},
): Promise<Finding[]> {
  const disabled = new Set(opts.disabledRules ?? []);
  const findings: Finding[] = [];
  for (const rule of staticRules) {
    if (disabled.has(rule.id)) continue;
    findings.push(...rule.check(snapshot));
  }
  const tokenFindings = await checkTokenRules(snapshot, {
    ...DEFAULT_BUDGET,
    ...opts.tokenBudget,
  });
  findings.push(...tokenFindings.filter((f) => !disabled.has(f.ruleId)));
  return dropOverlaps(findings);
}
