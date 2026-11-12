import type { Finding, Rule, ServerSnapshot } from "../types.js";
import { type TokenBudget } from "./token.js";
import { type Profile, type ProfileSetting, type Role, type Roles } from "../roles.js";
export declare const staticRules: Rule[];
export interface LintOptions {
    disabledRules?: string[];
    tokenBudget?: Partial<TokenBudget>;
    profile?: ProfileSetting;
    roles?: Record<string, Role>;
}
/** The profile and roles a run grades with; runRules and buildReport must get the same ones. */
export declare function gradingContext(snapshot: ServerSnapshot, opts?: LintOptions): {
    profile: Profile;
    roles: Roles;
};
export declare function runRules(snapshot: ServerSnapshot, opts?: LintOptions): Promise<Finding[]>;
