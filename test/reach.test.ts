import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { renderTerminal } from "../src/report.js";
import { catalogTokens } from "../src/rules/token.js";
import { buildReport } from "../src/score.js";
import type { ServerSnapshot } from "../src/types.js";

const snap: ServerSnapshot = {
  source: "t",
  tools: [{ name: "execute", description: "Run a JavaScript function body.", inputSchema: { type: "object", properties: {} } }],
};

describe("reach", () => {
  it("counts the catalog's tokens", async () => {
    expect(await catalogTokens(snap)).toBeGreaterThan(5);
    expect(await catalogTokens({ source: "t", tools: [] })).toBe(0);
  });

  it("shows declared operations as declared, and omits them otherwise", () => {
    const withOps = renderTerminal(buildReport(snap, [], { reach: { catalogTokens: 2000, apiOperations: 120, operationsPer1kTokens: 60 } }));
    expect(withOps).toMatch(/~2000 tokens per request · 120 operations reachable \(declared\), 60 per 1k tokens/);
    const without = renderTerminal(buildReport(snap, [], { reach: { catalogTokens: 2000 } }));
    expect(without).toMatch(/~2000 tokens per request/);
    expect(without).not.toMatch(/operations reachable/);
  });

  it("is not scored", () => {
    const a = buildReport(snap, []);
    const b = buildReport(snap, [], { reach: { catalogTokens: 99999, apiOperations: 1, operationsPer1kTokens: 0 } });
    expect(b.totalScore).toBe(a.totalScore);
  });

  it("rejects a non-integer apiOperations", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcpgrade-"));
    const path = join(dir, ".mcpgraderc.json");
    await writeFile(path, JSON.stringify({ apiOperations: "lots" }));
    await expect(loadConfig(path)).rejects.toThrow(/apiOperations/);
  });
});
