const CODE_PARAM = /^(code|script|source|source_code|program|snippet|js|javascript|typescript|python|lua)$/i;
const OPS_PARAM = /^(ops|operations|actions|commands|steps|requests|calls|batch|mutations)$/i;
const QUERY_PARAM = /^(query|q|keywords?|search|term)$/i;
const SEARCHES = /\b(search|find|look ?up|discover)\b/i;
const API_WORDS = /\b(api|operations?|ops|functions?|methods?|commands?|endpoints?|docs?|documentation|reference)\b/i;
const DOC_MIME = /typescript|schema\+json|openapi|yaml|markdown/i;
const DOC_NAME = /\.d\.ts\b|\bapi\b|schema|openapi|reference|\bdocs?\b/i;
function params(t) {
    return Object.entries(t.inputSchema?.properties ?? {});
}
function hasType(p, type) {
    return p.type === type || (Array.isArray(p.type) && p.type.includes(type));
}
function isCode(t) {
    return params(t).some(([name, p]) => CODE_PARAM.test(name) && hasType(p, "string"));
}
function isBatch(t) {
    return params(t).some(([name, p]) => {
        if (!hasType(p, "array")) {
            return false;
        }
        const items = (Array.isArray(p.items) ? p.items[0] : p.items);
        const ofObjects = !!items && (hasType(items, "object") || !!items.properties || items.additionalProperties !== undefined);
        return ofObjects && (OPS_PARAM.test(name) || /batch/i.test(t.name));
    });
}
function isSearch(t) {
    const text = `${t.name} ${t.description ?? ""}`;
    return params(t).some(([name, p]) => QUERY_PARAM.test(name) && hasType(p, "string"))
        && SEARCHES.test(text.replace(/_/g, " ")) && API_WORDS.test(text.replace(/_/g, " "));
}
export function detectRoles(s, overrides = {}) {
    const roles = { code: [], batch: [], search: [], docs: [] };
    for (const t of s.tools) {
        const forced = overrides[t.name];
        const role = forced ?? (isCode(t) ? "code" : isBatch(t) ? "batch" : isSearch(t) ? "search" : "none");
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
export function resolveProfile(setting, roles) {
    if (setting !== "auto") {
        return setting;
    }
    return roles.code.length || roles.batch.length ? "code-mode" : "classic";
}
export function parseRoles(raw) {
    if (raw === undefined) {
        return {};
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error('"roles" must map tool names to "code", "batch", "search" or "none"');
    }
    const out = {};
    for (const [tool, role] of Object.entries(raw)) {
        if (role !== "code" && role !== "batch" && role !== "search" && role !== "none") {
            throw new Error(`roles.${tool} must be "code", "batch", "search" or "none"`);
        }
        out[tool] = role;
    }
    return out;
}
export function parseProfile(raw) {
    if (raw === undefined) {
        return "auto";
    }
    if (raw !== "auto" && raw !== "classic" && raw !== "code-mode") {
        throw new Error('"profile" must be "auto", "classic" or "code-mode"');
    }
    return raw;
}
