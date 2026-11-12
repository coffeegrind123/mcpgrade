import type { Profile, Roles } from "./roles.js";
import { type AcceptedFinding, type Finding, type Report, type RuleException, type ServerSnapshot } from "./types.js";
export declare function buildReport(snapshot: ServerSnapshot, findings: Finding[], extra?: {
    accepted?: AcceptedFinding[];
    unusedExceptions?: RuleException[];
    profile?: Profile;
    roles?: Roles;
    reach?: Report["reach"];
}): Report;
