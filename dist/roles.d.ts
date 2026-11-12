import type { ServerSnapshot } from "./types.js";
/**
 * What a tool is for in a code-first server:
 *
 *   code    runs a program the model writes (a "code mode" / execute tool)
 *   batch   applies a list of operations in one call
 *   search  finds operations or docs in the server's API
 *   none    none of these (set in config to undo a wrong detection)
 *
 * Detection is a heuristic over names and descriptions; the report prints what it found and
 * .mcpgraderc.json "roles" overrides it per tool.
 */
export type Role = "code" | "batch" | "search" | "none";
export interface Roles {
    code: string[];
    batch: string[];
    search: string[];
    /** Resources and templates that document the API (URIs / URI templates). */
    docs: string[];
}
export type Profile = "classic" | "code-mode";
export type ProfileSetting = Profile | "auto";
export declare function detectRoles(s: ServerSnapshot, overrides?: Record<string, Role>): Roles;
/** auto: code-mode when the server has a code or a batch tool. */
export declare function resolveProfile(setting: ProfileSetting, roles: Roles): Profile;
export declare function parseRoles(raw: unknown): Record<string, Role>;
export declare function parseProfile(raw: unknown): ProfileSetting;
