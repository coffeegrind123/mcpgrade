/**
 * Checks the "exceptions" list from .mcpgraderc.json. Every entry needs a rule and a reason:
 * an exception without a reason is just a silenced rule.
 */
export function parseExceptions(raw) {
    if (raw === undefined) {
        return [];
    }
    if (!Array.isArray(raw)) {
        throw new Error('"exceptions" must be an array of {"rule", "tool"?, "reason"}');
    }
    return raw.map((e, i) => {
        const at = `exceptions[${i}]`;
        if (!e || typeof e !== "object") {
            throw new Error(`${at} must be an object`);
        }
        const { rule, tool, reason } = e;
        if (typeof rule !== "string" || !/^[A-Z]\d{3}$/.test(rule)) {
            throw new Error(`${at}.rule must be a rule id like "S007"`);
        }
        if (tool !== undefined && (typeof tool !== "string" || !tool)) {
            throw new Error(`${at}.tool must be a tool name (omit it to cover the whole server)`);
        }
        if (typeof reason !== "string" || !reason.trim()) {
            throw new Error(`${at}.reason is required: say why ${rule} does not apply`);
        }
        return { rule, ...(tool !== undefined ? { tool: tool } : {}), reason: reason.trim() };
    });
}
/**
 * Splits findings into scored and accepted. An exception with a tool matches that tool's
 * findings of the rule; without one, every finding of the rule. Exceptions that match
 * nothing come back as unused, so stale config shows up instead of lingering.
 */
export function applyExceptions(findings, exceptions) {
    const used = new Set();
    const kept = [];
    const accepted = [];
    for (const f of findings) {
        const e = exceptions.find((x) => x.rule === f.ruleId && (x.tool === undefined || x.tool === f.toolName));
        if (!e) {
            kept.push(f);
            continue;
        }
        used.add(e);
        accepted.push({ ...f, reason: e.reason });
    }
    return { findings: kept, accepted, unused: exceptions.filter((e) => !used.has(e)) };
}
