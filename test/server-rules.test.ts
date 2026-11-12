import { describe, expect, it } from "vitest";
import { runRules } from "../src/rules/index.js";
import { I001, I002, INSTRUCTIONS_MAX_CHARS } from "../src/rules/server.js";
import type { ServerSnapshot, ToolDef } from "../src/types.js";

const tools = (n: number): ToolDef[] => Array.from({ length: n }, (_, i) => ({ name: `tool_${i}` }));

describe("I001 no server instructions", () => {
  it("fires when a server with 5+ tools sends none", () => {
    const f = I001.check({ source: "t", tools: tools(5), instructions: null });
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/5 tools/);
  });

  it("fires on a small server that has resources or prompts", () => {
    const f = I001.check({
      source: "t", tools: tools(1), instructions: "", resources: [{ uri: "doc://api" }], prompts: [],
    });
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/1 resources, templates or prompts/);
  });

  it("is quiet for a small server with nothing else", () => {
    expect(I001.check({ source: "t", tools: tools(4), instructions: null, resources: [], prompts: [] })).toEqual([]);
  });

  it("is quiet when instructions were not captured (an old snapshot file)", () => {
    expect(I001.check({ source: "t", tools: tools(20) })).toEqual([]);
  });

  it("is quiet when instructions exist", () => {
    expect(I001.check({ source: "t", tools: tools(20), instructions: "Start with list_items." })).toEqual([]);
  });
});

describe("I002 instructions too long", () => {
  it("fires past the limit and says how much is lost", () => {
    const f = I002.check({ source: "t", tools: [], instructions: "x".repeat(INSTRUCTIONS_MAX_CHARS + 10) });
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/last 10 never reach/);
  });

  it("is quiet at the limit", () => {
    expect(I002.check({ source: "t", tools: [], instructions: "x".repeat(INSTRUCTIONS_MAX_CHARS) })).toEqual([]);
  });
});

describe("D004 / S008 overlap (issue #9)", () => {
  const snap: ServerSnapshot = {
    source: "t",
    tools: [{
      name: "create_items",
      description: "Create items in the store. Use for new records. Returns the created ids.",
      inputSchema: {
        type: "object",
        properties: {
          items: { type: "array" },
          tags: { type: "array", description: "Labels to attach to every item." },
        },
        required: ["items"],
      },
    }],
  };

  it("charges an undescribed complex parameter once (D004), not twice", async () => {
    const f = await runRules(snap);
    const on = (rule: string) => f.filter((x) => x.ruleId === rule).map((x) => x.param);
    expect(on("D004")).toEqual(["items"]);
    expect(on("S008")).toEqual(["tags"]);
  });
});
