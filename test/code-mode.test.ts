import { describe, expect, it } from "vitest";
import { gradingContext, runRules } from "../src/rules/index.js";
import { checkProgRules } from "../src/rules/prog.js";
import { detectRoles, parseProfile, parseRoles, resolveProfile } from "../src/roles.js";
import { buildReport } from "../src/score.js";
import type { ServerSnapshot, ToolDef } from "../src/types.js";

const execute: ToolDef = {
  name: "execute",
  description:
    "Run a JavaScript function body against the typed store API (find operations with search_api) as one transaction: "
    + "`return` gives the result as JSON, console.log is captured, and an error or the 10 s time limit rolls everything back.",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: 'JavaScript function body, e.g. "return store.count()"' },
      read_only: { type: "boolean", description: "Refuse every write; needs only read access." },
      operation_id: { type: "string", description: "Resending the same id returns the first result." },
    },
    required: ["code"],
  },
};

const batch: ToolDef = {
  name: "batch",
  description:
    "Apply a list of store operations as one all-or-nothing step; later operations refer to earlier results as \"$0.id\". "
    + "The operations are listed by search_api.",
  inputSchema: {
    type: "object",
    properties: {
      ops: { type: "array", maxItems: 200, items: { type: "object" }, description: 'Operations, e.g. [{"op": "items.create"}]' },
      operation_id: { type: "string", description: "Idempotency key." },
    },
    required: ["ops"],
  },
};

const searchApi: ToolDef = {
  name: "search_api",
  description: "Search the store API for operations by keywords. Returns matching operations with signatures.",
  inputSchema: { type: "object", properties: { query: { type: "string", description: "Keywords, e.g. 'create item'." } }, required: ["query"] },
  annotations: { readOnlyHint: true },
};

const codeFirst = (over: Partial<ServerSnapshot> = {}): ServerSnapshot => ({
  source: "test://code-first",
  tools: [execute, batch, searchApi],
  instructions: "Find operations with search_api; the typed API is at docs://api/{area}.d.ts.",
  resources: [{ uri: "docs://api/index.md", mimeType: "text/markdown" }],
  resourceTemplates: [{ uriTemplate: "docs://api/{area}.d.ts", mimeType: "text/x-typescript" }],
  prompts: [],
  ...over,
});

const ids = (s: ServerSnapshot) => checkProgRules(s, detectRoles(s)).map((f) => f.ruleId).sort();

describe("role detection and profile", () => {
  it("finds the code, batch and search tools and the API docs", () => {
    expect(detectRoles(codeFirst())).toEqual({
      code: ["execute"], batch: ["batch"], search: ["search_api"],
      docs: ["docs://api/index.md", "docs://api/{area}.d.ts"],
    });
  });

  it("does not mistake an ordinary search or array parameter for a role", () => {
    const tools: ToolDef[] = [
      { name: "search_issues", description: "Search issues by text.", inputSchema: { type: "object", properties: { query: { type: "string" } } } },
      { name: "create_items", description: "Create items.", inputSchema: { type: "object", properties: { items: { type: "array", items: { type: "object" } } } } },
    ];
    expect(detectRoles({ source: "t", tools })).toEqual({ code: [], batch: [], search: [], docs: [] });
  });

  it("config roles override detection", () => {
    const r = detectRoles(codeFirst(), { execute: "none", search_api: "code" });
    expect(r.code).toEqual(["search_api"]);
  });

  it("auto is code-mode with a code or batch tool, classic otherwise", () => {
    expect(resolveProfile("auto", detectRoles(codeFirst()))).toBe("code-mode");
    expect(resolveProfile("auto", detectRoles({ source: "t", tools: [searchApi] }))).toBe("classic");
    expect(resolveProfile("classic", detectRoles(codeFirst()))).toBe("classic");
  });

  it("rejects an unknown profile or role", () => {
    expect(() => parseProfile("lenient")).toThrow(/profile/);
    expect(() => parseRoles({ execute: "runner" })).toThrow(/roles.execute/);
    expect(parseProfile(undefined)).toBe("auto");
  });
});

describe("Programmability rules", () => {
  it("a server that states everything has no findings", () => {
    expect(ids(codeFirst())).toEqual([]);
  });

  it("each missing fact trips its rule", () => {
    const bare: ToolDef = {
      name: "execute", description: "Runs it.",
      inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    };
    const bareBatch: ToolDef = {
      name: "batch", description: "Applies them.",
      inputSchema: { type: "object", properties: { ops: { type: "array", items: { type: "object" } } }, required: ["ops"] },
    };
    expect(ids({ source: "t", tools: [bare, bareBatch], instructions: null, resources: [], resourceTemplates: [] }))
      .toEqual(["P001", "P002", "P003", "P004", "P004", "P005", "P005", "P007", "P008", "P008", "P009"]);
  });

  it("a read-only code tool is not asked about rollback or idempotency", () => {
    const ro: ToolDef = { ...execute, name: "query", annotations: { readOnlyHint: true } };
    const s = codeFirst({ tools: [ro, searchApi] });
    expect(ids(s)).toEqual([]);
  });

  it("a documentation URI that matches nothing is P006", () => {
    const s = codeFirst({ instructions: "Find operations with search_api; see docs://reference/all.md." });
    const f = checkProgRules(s, detectRoles(s));
    expect(f.map((x) => x.ruleId)).toEqual(["P006"]);
    expect(f[0].message).toMatch(/docs:\/\/reference\/all\.md/);
  });

  it("dangling URIs are not judged when resources were not captured", () => {
    const s = codeFirst({ instructions: "See docs://reference/all.md.", resources: undefined, resourceTemplates: undefined });
    expect(ids(s)).toEqual([]);
  });
});

describe("scoring under the two profiles", () => {
  it("code-mode adds Programmability and exempts the code tool from N003", async () => {
    const s = codeFirst();
    const ctx = gradingContext(s);
    const report = buildReport(s, await runRules(s), ctx);
    expect(report.profile).toBe("code-mode");
    expect(report.categories.map((c) => c.category)).toContain("prog");
    expect(report.findings.some((f) => f.ruleId === "N003")).toBe(false);
  });

  it("classic keeps the five categories and still flags the generic verb", async () => {
    const s = codeFirst();
    const opts = { profile: "classic" as const };
    const report = buildReport(s, await runRules(s, opts), gradingContext(s, opts));
    expect(report.profile).toBe("classic");
    expect(report.categories.map((c) => c.category)).not.toContain("prog");
    expect(report.findings.some((f) => f.ruleId === "N003" && f.toolName === "execute")).toBe(true);
  });

  it("Programmability is normalised by the role tools, not the whole catalog", async () => {
    const filler: ToolDef[] = Array.from({ length: 20 }, (_, i) => ({
      name: `get_item_${i}`, description: `Get item number ${i} from the store. Returns the item as JSON.`,
      inputSchema: { type: "object", properties: {}, required: [] },
    }));
    const bare: ToolDef = { name: "execute", description: "Runs it.", inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } };
    const s: ServerSnapshot = { source: "t", tools: [bare, ...filler], instructions: "x", resources: [], resourceTemplates: [] };
    const report = buildReport(s, await runRules(s), gradingContext(s));
    const prog = report.categories.find((c) => c.category === "prog")!;
    expect(prog.score).toBeLessThan(50);
  });
});
