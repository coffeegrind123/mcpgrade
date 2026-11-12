import { describe, expect, it } from "vitest";
import { runRules } from "../src/rules/index.js";
import type { ServerSnapshot, ToolDef } from "../src/types.js";

const plain = (n: number): ToolDef[] => Array.from({ length: n }, (_, i) => ({
  name: `get_record_${i}`,
  description: `Get record number ${i} from the archive. Use when that record is needed. Returns it as JSON.`,
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
}));

const code: ToolDef = {
  name: "execute",
  description: "Run a JavaScript function body against the archive API; `return` gives the result.",
  inputSchema: { type: "object", properties: { code: { type: "string", description: "JavaScript, e.g. 'return 1'" } }, required: ["code"] },
};

const ruleIds = async (s: ServerSnapshot, opts = {}) => (await runRules(s, opts)).map((f) => f.ruleId);

describe("T005 tool sprawl", () => {
  it("is quiet below the threshold", async () => {
    expect(await ruleIds({ source: "t", tools: plain(14) })).not.toContain("T005");
  });

  it("fires at 15 tools with no code or batch tool", async () => {
    expect(await ruleIds({ source: "t", tools: plain(15) })).toContain("T005");
  });

  it("replaces T004 when both apply", async () => {
    const ids = await ruleIds({ source: "t", tools: plain(30) });
    expect(ids).toContain("T005");
    expect(ids).not.toContain("T004");
  });

  it("does not fire when the server has a code tool; T004 still can", async () => {
    const ids = await ruleIds({ source: "t", tools: [code, ...plain(29)] });
    expect(ids).not.toContain("T005");
    expect(ids).toContain("T004");
  });

  it("disabling T005 keeps T004, and the threshold is configurable", async () => {
    expect(await ruleIds({ source: "t", tools: plain(30) }, { disabledRules: ["T005"] })).toContain("T004");
    expect(await ruleIds({ source: "t", tools: plain(10) }, { tokenBudget: { sprawlTools: 10 } })).toContain("T005");
  });
});
