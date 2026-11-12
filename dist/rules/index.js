import { descRules } from "./desc.js";
import { nameRules } from "./name.js";
import { schemaRules } from "./schema.js";
import { consistRules } from "./consist.js";
import { serverRules } from "./server.js";
import { checkSprawl, checkTokenRules, DEFAULT_BUDGET } from "./token.js";
import { checkProgRules } from "./prog.js";
import { detectRoles, resolveProfile } from "../roles.js";
export const staticRules = [...descRules, ...nameRules, ...schemaRules, ...consistRules, ...serverRules];
/**
 * One defect, one charge (issue #9): a parameter with no description at all (D004) is not
 * also charged for having no example (S008). D004's fix already asks for an example.
 */
/**
 * In code-mode the code tool's generic verb is the convention ("execute", "run"), and what it
 * operates on is the API its description points at (P005), so N003 does not apply to it.
 */
function exemptCodeTools(findings, profile, roles) {
    if (profile !== "code-mode") {
        return findings;
    }
    return findings.filter((f) => !(f.ruleId === "N003" && f.toolName !== undefined && roles.code.includes(f.toolName)));
}
function dropOverlaps(findings) {
    const undescribed = new Set(findings.filter((f) => f.ruleId === "D004" && f.param !== undefined).map((f) => `${f.toolName}\u0000${f.param}`));
    return findings.filter((f) => f.ruleId !== "S008" || !undescribed.has(`${f.toolName}\u0000${f.param}`));
}
/** The profile and roles a run grades with; runRules and buildReport must get the same ones. */
export function gradingContext(snapshot, opts = {}) {
    const roles = detectRoles(snapshot, opts.roles);
    return { profile: resolveProfile(opts.profile ?? "auto", roles), roles };
}
export async function runRules(snapshot, opts = {}) {
    const disabled = new Set(opts.disabledRules ?? []);
    const findings = [];
    for (const rule of staticRules) {
        if (disabled.has(rule.id))
            continue;
        findings.push(...rule.check(snapshot));
    }
    const tokenFindings = await checkTokenRules(snapshot, {
        ...DEFAULT_BUDGET,
        ...opts.tokenBudget,
    });
    findings.push(...tokenFindings.filter((f) => !disabled.has(f.ruleId)));
    const { profile, roles } = gradingContext(snapshot, opts);
    if (profile === "code-mode") {
        findings.push(...checkProgRules(snapshot, roles).filter((f) => !disabled.has(f.ruleId)));
    }
    const sprawled = disabled.has("T005")
        ? findings
        : checkSprawl(snapshot, roles, findings, { ...DEFAULT_BUDGET, ...opts.tokenBudget });
    return dropOverlaps(exemptCodeTools(sprawled, profile, roles));
}
