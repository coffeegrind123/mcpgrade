import type { TokenBudget } from "./rules/token.js";
import type { RuleException } from "./types.js";
import { type ProfileSetting, type Role } from "./roles.js";
export interface McpgradeConfig {
    disable?: string[];
    tokenBudget?: Partial<TokenBudget>;
    /** Per-tool (or server-wide) rule exceptions, each with a reason. */
    exceptions?: RuleException[];
    /** auto (default), classic or code-mode. */
    profile?: ProfileSetting;
    /** Corrects role detection per tool: "code", "batch", "search" or "none". */
    roles?: Record<string, Role>;
    /** How many operations the server's API offers (through its code/batch/search tools); reported, not scored. */
    apiOperations?: number;
}
/** Load config from --config path or ./.mcpgraderc.json if present. */
export declare function loadConfig(explicitPath?: string): Promise<McpgradeConfig>;
