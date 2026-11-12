import type { JsonSchema, ServerSnapshot, ToolDef } from "./types.js";

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

const CODE_PARAM = /^(code|script|source|source_code|program|snippet|js|javascript|typescript|python|lua)$/i;
const OPS_PARAM = /^(ops|operations|actions|commands|steps|requests|calls|batch|mutations)$/i;
const QUERY_PARAM = /^(query|q|keywords?|search|term)$/i;
const SEARCHES = /\b(search|find|look ?up|discover)\b/i;
const API_WORDS = /\b(api|operations?|ops|functions?|methods?|commands?|endpoints?|docs?|documentation|reference)\b/i;
const DOC_MIME = /typescript|schema\+json|openapi|yaml|markdown/i;
const DOC_NAME = /\.d\.ts\b|\bapi\b|schema|openapi|reference|\bdocs?\b/i;

function params(t: ToolDef): [string, JsonSchema][] {
  return Object.entries(t.inputSchema?.properties ?? {});
}

function hasType(p: JsonSchema, type: string): boolean {
  return p.type === type || (Array.isArray(p.type) && p.type.includes(type));
}

function isCode(t: ToolDef): boolean {
  return params(t).some(([name, p]) => CODE_PARAM.test(name) && hasType(p, "string"));
}

function isBatch(t: ToolDef): boolean {
  return params(t).some(([name, p]) => {
    if (!hasType(p, "array")) {
      return false;
    }
    const items = (Array.isArray(p.items) ? p.items[0] : p.items) as JsonSchema | undefined;
    const ofObjects = !!items && (hasType(items, "object") || !!items.properties || items.additionalProperties !== undefined);
    return ofObjects && (OPS_PARAM.test(name) || /batch/i.test(t.name));
  });
}

function isSearch(t: ToolDef): boolean {
  const text = `${t.name} ${t.description ?? ""}`;
  return params(t).some(([name, p]) => QUERY_PARAM.test(name) && hasType(p, "string"))
    && SEARCHES.test(text.replace(/_/g, " ")) && API_WORDS.test(text.replace(/_/g, " "));
}

export function detectRoles(s: ServerSnapshot, overrides: Record<string, Role> = {}): Roles {
  const roles: Roles = { code: [], batch: [], search: [], docs: [] };
  for (const t of s.tools) {
    const forced = overrides[t.name];
    const role: Role = forced ?? (isCode(t) ? "code" : isBatch(t) ? "batch" : isSearch(t) ? "search" : "none");
    if (role !== "none") {
      roles[role].push(t.name);
    }
  }
  for (const r of s.resources ?? []) {
    if (DOC_MIME.test(r.mimeType ?? "") || DOC_NAME.test(`${r.uri} ${r.name ?? ""}`)) {
      roles.docs.push(r.uri);
    }
  }
  for (const r of s.resourceTemplates ?? []) {
    if (DOC_MIME.test(r.mimeType ?? "") || DOC_NAME.test(`${r.uriTemplate} ${r.name ?? ""}`)) {
      roles.docs.push(r.uriTemplate);
    }
  }
  return roles;
}

/** auto: code-mode when the server has a code or a batch tool. */
export function resolveProfile(setting: ProfileSetting, roles: Roles): Profile {
  if (setting !== "auto") {
    return setting;
  }
  return roles.code.length || roles.batch.length ? "code-mode" : "classic";
}

export function parseRoles(raw: unknown): Record<string, Role> {
  if (raw === undefined) {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error('"roles" must map tool names to "code", "batch", "search" or "none"');
  }
  const out: Record<string, Role> = {};
  for (const [tool, role] of Object.entries(raw)) {
    if (role !== "code" && role !== "batch" && role !== "search" && role !== "none") {
      throw new Error(`roles.${tool} must be "code", "batch", "search" or "none"`);
    }
    out[tool] = role as Role;
  }
  return out;
}

export function parseProfile(raw: unknown): ProfileSetting {
  if (raw === undefined) {
    return "auto";
  }
  if (raw !== "auto" && raw !== "classic" && raw !== "code-mode") {
    throw new Error('"profile" must be "auto", "classic" or "code-mode"');
  }
  return raw as ProfileSetting;
}
