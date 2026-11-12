import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { TokenBudget } from "./rules/token.js";
import type { RuleException } from "./types.js";
import { parseExceptions } from "./exceptions.js";
import { parseProfile, parseRoles, type ProfileSetting, type Role } from "./roles.js";

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

function parseOperations(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    throw new Error('"apiOperations" must be a positive whole number');
  }
  return raw;
}

/** Load config from --config path or ./.mcpgraderc.json if present. */
export async function loadConfig(explicitPath?: string): Promise<McpgradeConfig> {
  const path = explicitPath ?? resolve(process.cwd(), ".mcpgraderc.json");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    if (explicitPath) {
      throw new Error(`Could not read config file: ${explicitPath}`);
    }
    return {}; // no rc file — defaults
  }
  // A config that exists but is wrong is an error, not a silent fallback to defaults.
  try {
    return {
      ...(raw as McpgradeConfig),
      exceptions: parseExceptions(raw.exceptions),
      profile: parseProfile(raw.profile),
      roles: parseRoles(raw.roles),
      ...(raw.apiOperations !== undefined ? { apiOperations: parseOperations(raw.apiOperations) } : {}),
    };
  } catch (err) {
    throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
