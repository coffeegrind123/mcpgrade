import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseExceptions } from "./exceptions.js";
import { parseProfile, parseRoles } from "./roles.js";
function parseOperations(raw) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
        throw new Error('"apiOperations" must be a positive whole number');
    }
    return raw;
}
/** Load config from --config path or ./.mcpgraderc.json if present. */
export async function loadConfig(explicitPath) {
    const path = explicitPath ?? resolve(process.cwd(), ".mcpgraderc.json");
    let raw;
    try {
        raw = JSON.parse(await readFile(path, "utf8"));
    }
    catch (err) {
        if (explicitPath) {
            throw new Error(`Could not read config file: ${explicitPath}`);
        }
        return {}; // no rc file — defaults
    }
    // A config that exists but is wrong is an error, not a silent fallback to defaults.
    try {
        return {
            ...raw,
            exceptions: parseExceptions(raw.exceptions),
            profile: parseProfile(raw.profile),
            roles: parseRoles(raw.roles),
            ...(raw.apiOperations !== undefined ? { apiOperations: parseOperations(raw.apiOperations) } : {}),
        };
    }
    catch (err) {
        throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
