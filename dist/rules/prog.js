/**
 * Programmability rules (code-mode profile only): does a code-first server tell the model enough
 * to write a working program or batch on the first try? They read the tool's description and its
 * parameters' descriptions; a fact stated in either counts.
 */
const LANGUAGE = /\b(JavaScript|TypeScript|Python|Lua|Luau|Ruby|SQL|Bash|PowerShell|GDScript|C#|Rust|JS|TS|ECMAScript|Starlark|Jsonnet)\b/;
const RESULT = /\breturn(s|ed)?\b|\bprint(s|ed)?\b|console\.log|stdout|last expression/i;
const LIMITS = /time ?limit|time-?out|\bmemory\b|\blimit(s|ed)?\b|\bbudget\b|\bmax(imum)?\b|\b\d+\s?(ms|s|sec|seconds|minutes|kb|mb)\b/i;
const LIMIT_PARAM = /timeout|limit|budget|^max_|_max$/i;
const ATOMIC = /roll(s|ed|ing)?[ -]?back|\batomic|transaction|all[- ]or[- ]nothing|nothing (is |was )?(changed|applied)|undo step/i;
const BATCH_SIZE = /\bmax(imum)?\b|\bup to \d+|\b\d+ (ops|operations|steps|items)\b|\blimit\b/i;
const BATCH_REFS = /\$\d|\$\{?\d|earlier results?|previous results?|results? of (an )?earlier|refer(s|ence)? to/i;
const IDEMPOTENCY_PARAM = /idempot|operation_id|request_id|client_token|dedup/i;
const READ_ONLY_PARAM = /read_?only|dry_?run|preview/i;
const URI = /\b([a-z][a-z0-9+.-]*):\/\/[^\s`"')<>\],;]+/gi;
function text(t) {
    const params = Object.values(t.inputSchema?.properties ?? {}).map((p) => p.description ?? "");
    return [t.description ?? "", ...params].join("\n");
}
function paramNames(t) {
    return Object.keys(t.inputSchema?.properties ?? {});
}
function writes(t) {
    return t.annotations?.readOnlyHint !== true;
}
function finding(ruleId, severity, t, message, fix) {
    return { ruleId, severity, category: "prog", ...(t ? { toolName: t.name } : {}), message, fix };
}
/** The part of a URI before its first placeholder: "doc://api/{area}.d.ts" -> "doc://api/". */
function uriPrefix(uri) {
    const cut = uri.search(/[<{*]/);
    return (cut === -1 ? uri : uri.slice(0, cut)).replace(/[.:]+$/, "");
}
function mentionedUris(s) {
    return [...s.matchAll(URI)].map((m) => m[0].replace(/[.:]+$/, "")).filter((u) => !/^https?:/i.test(u));
}
export function checkProgRules(s, roles) {
    const out = [];
    const byName = new Map(s.tools.map((t) => [t.name, t]));
    const code = roles.code.map((n) => byName.get(n)).filter((t) => !!t);
    const batch = roles.batch.map((n) => byName.get(n)).filter((t) => !!t);
    const instructions = s.instructions ?? "";
    for (const t of code) {
        const tx = text(t);
        if (!LANGUAGE.test(tx)) {
            out.push(finding("P001", "error", t, `"${t.name}" runs code but never names the language.`, 'Name the language and its flavour in the description, e.g. "a JavaScript function body".'));
        }
        if (!RESULT.test(tx)) {
            out.push(finding("P002", "warn", t, `"${t.name}" does not say how a program hands back its result.`, 'Say how a value comes back, e.g. "`return` gives the result (any JSON); console.log is captured".'));
        }
        if (!LIMITS.test(tx) && !paramNames(t).some((n) => LIMIT_PARAM.test(n))) {
            out.push(finding("P003", "warn", t, `"${t.name}" states no limits (time, memory, output size).`, "State the limits and what happens at them, or expose them as parameters (e.g. timeout_ms)."));
        }
        const offersReadOnly = !writes(t) || paramNames(t).some((n) => READ_ONLY_PARAM.test(n)) || code.some((o) => o !== t && !writes(o));
        if (!offersReadOnly) {
            out.push(finding("P009", "info", t, `"${t.name}" has no read-only mode, so even a pure read needs write access.`, "Offer read_only (or a dry run) that refuses writes, or a separate read-only code tool."));
        }
    }
    for (const t of [...code, ...batch]) {
        const tx = text(t);
        if (writes(t) && !ATOMIC.test(tx)) {
            out.push(finding("P004", "warn", t, `"${t.name}" does not say what a failure halfway leaves behind.`, "Say whether a failing program or batch rolls back (all-or-nothing) or leaves partial changes."));
        }
        if (writes(t) && !paramNames(t).some((n) => IDEMPOTENCY_PARAM.test(n))) {
            out.push(finding("P008", "info", t, `"${t.name}" changes state but takes no idempotency key, so a retry may apply twice.`, "Accept an operation id and return the first result when it repeats."));
        }
    }
    for (const t of batch) {
        const tx = text(t);
        const ops = Object.values(t.inputSchema?.properties ?? {}).find((p) => p.type === "array");
        const missing = [
            ...(ops?.maxItems === undefined && !BATCH_SIZE.test(tx) ? ["its size limit"] : []),
            ...(!BATCH_REFS.test(tx) ? ["whether a later operation can use an earlier one's result"] : []),
        ];
        if (missing.length) {
            out.push(finding("P007", "warn", t, `"${t.name}" does not state ${missing.join(" or ")}.`, 'State the most operations per call (or set maxItems) and how to refer to earlier results, e.g. "$0.id".'));
        }
    }
    // P005 / P006: can the model find the API, and do the pointers lead anywhere?
    for (const t of [...code, ...batch]) {
        const tx = `${text(t)}\n${instructions}`;
        const pointsAtSearch = roles.search.some((n) => tx.includes(n));
        const uris = mentionedUris(tx);
        if (!pointsAtSearch && uris.length === 0) {
            out.push(finding("P005", "warn", t, `Neither "${t.name}" nor the server instructions say where the API it runs against is described.`, roles.search.length || roles.docs.length
                ? `Point at it: name the search tool (${[...roles.search, ...roles.docs].slice(0, 3).join(", ")}) in the description or the instructions.`
                : "Publish the API (typed resources such as .d.ts files, or a search tool) and point at it from the description or the instructions."));
        }
    }
    if (s.resources !== undefined && s.resourceTemplates !== undefined) {
        const known = [...s.resources.map((r) => r.uri), ...s.resourceTemplates.map((r) => r.uriTemplate)].map(uriPrefix);
        const texts = [...code, ...batch].map(text).concat(instructions);
        const dangling = new Set();
        for (const u of texts.flatMap(mentionedUris)) {
            const p = uriPrefix(u);
            if (!known.some((k) => k.startsWith(p) || p.startsWith(k))) {
                dangling.add(u);
            }
        }
        for (const u of dangling) {
            out.push(finding("P006", "warn", undefined, `"${u}" is mentioned as documentation but the server lists no such resource.`, "List the resource (or template) it names, or correct the URI."));
        }
    }
    return out;
}
