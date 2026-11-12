import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { applyExceptions, parseExceptions } from "../src/exceptions.js";
import { buildReport } from "../src/score.js";
import type { Finding, ServerSnapshot } from "../src/types.js";

const finding = (ruleId: string, toolName?: string): Finding => ({
  ruleId, severity: "warn", category: "schema", toolName, message: `${ruleId} on ${toolName}`, fix: "fix",
});

describe("parseExceptions", () => {
  it("accepts rule + tool + reason, and rule + reason for the whole server", () => {
    expect(parseExceptions([
      { rule: "S007", tool: "look", reason: " one view tool " },
      { rule: "N003", reason: "code-mode name" },
    ])).toEqual([
      { rule: "S007", tool: "look", reason: "one view tool" },
      { rule: "N003", reason: "code-mode name" },
    ]);
  });

  it("treats a missing list as no exceptions", () => {
    expect(parseExceptions(undefined)).toEqual([]);
  });

  it("refuses an exception without a reason", () => {
    expect(() => parseExceptions([{ rule: "S007", tool: "look" }])).toThrow(/reason is required/);
    expect(() => parseExceptions([{ rule: "S007", reason: "  " }])).toThrow(/reason is required/);
  });

  it("refuses a malformed rule id, tool or list", () => {
    expect(() => parseExceptions([{ rule: "s7", reason: "x" }])).toThrow(/rule id/);
    expect(() => parseExceptions([{ rule: "S007", tool: "", reason: "x" }])).toThrow(/tool/);
    expect(() => parseExceptions({ rule: "S007" })).toThrow(/array/);
  });
});

describe("applyExceptions", () => {
  const findings = [finding("S007", "look"), finding("S007", "batch"), finding("N003", "execute"), finding("T001")];

  it("a tool exception accepts only that tool's finding of that rule", () => {
    const r = applyExceptions(findings, [{ rule: "S007", tool: "look", reason: "by design" }]);
    expect(r.accepted.map((f) => [f.ruleId, f.toolName, f.reason])).toEqual([["S007", "look", "by design"]]);
    expect(r.findings.map((f) => `${f.ruleId}:${f.toolName}`)).toEqual(["S007:batch", "N003:execute", "T001:undefined"]);
    expect(r.unused).toEqual([]);
  });

  it("a server-wide exception accepts every finding of the rule", () => {
    const r = applyExceptions(findings, [{ rule: "S007", reason: "x" }]);
    expect(r.accepted).toHaveLength(2);
    expect(r.findings.some((f) => f.ruleId === "S007")).toBe(false);
  });

  it("reports an exception that matched nothing", () => {
    const stale = { rule: "D004", tool: "gone", reason: "old" };
    expect(applyExceptions(findings, [stale]).unused).toEqual([stale]);
  });

  it("accepted findings are listed but not scored", () => {
    const snap: ServerSnapshot = { source: "t", tools: [{ name: "look" }, { name: "batch" }] };
    const r = applyExceptions([finding("S007", "look")], [{ rule: "S007", tool: "look", reason: "by design" }]);
    const report = buildReport(snap, r.findings, { accepted: r.accepted, unusedExceptions: r.unused });
    const schema = report.categories.find((c) => c.category === "schema")!;
    expect(schema.score).toBe(100);
    expect(report.findings).toEqual([]);
    expect(report.accepted).toHaveLength(1);
  });
});

describe("loadConfig", () => {
  it("fails on an invalid exception instead of falling back to defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcpgrade-"));
    const path = join(dir, ".mcpgraderc.json");
    await writeFile(path, JSON.stringify({ exceptions: [{ rule: "S007" }] }));
    await expect(loadConfig(path)).rejects.toThrow(/reason is required/);
  });

  it("returns the parsed exceptions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcpgrade-"));
    const path = join(dir, ".mcpgraderc.json");
    await writeFile(path, JSON.stringify({ disable: ["C002"], exceptions: [{ rule: "S007", tool: "look", reason: "r" }] }));
    expect(await loadConfig(path)).toEqual({ disable: ["C002"], exceptions: [{ rule: "S007", tool: "look", reason: "r" }] });
  });
});
