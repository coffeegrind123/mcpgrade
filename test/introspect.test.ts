import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readAllPages, snapshotFromClient, snapshotFromFile } from "../src/introspect.js";

const schema = { type: "object" as const, properties: {} };

/** A server with two pages of tools, resources, templates and prompts. */
async function connect(opts: { instructions?: string; resources?: boolean; prompts?: boolean; failTemplates?: boolean }) {
  const server = new Server(
    { name: "fixture", version: "1.0.0" },
    {
      capabilities: { tools: {}, ...(opts.resources ? { resources: {} } : {}), ...(opts.prompts ? { prompts: {} } : {}) },
      ...(opts.instructions !== undefined ? { instructions: opts.instructions } : {}),
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async (req) => req.params?.cursor === "p2"
    ? { tools: [{ name: "second", inputSchema: schema }] }
    : { tools: [{ name: "first", inputSchema: schema }], nextCursor: "p2" });
  if (opts.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [{ uri: "doc://api/index.md", name: "API index", mimeType: "text/markdown" }],
    }));
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      if (opts.failTemplates) {
        throw new Error("templates are broken");
      }
      return { resourceTemplates: [{ uriTemplate: "doc://api/{area}.d.ts", name: "area" }] };
    });
  }
  if (opts.prompts) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [{ name: "build" }] }));
  }
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  return client;
}

describe("snapshotFromClient", () => {
  it("reads every page of tools, plus instructions, resources, templates and prompts", async () => {
    const client = await connect({ instructions: "Start with first.", resources: true, prompts: true });
    const s = await snapshotFromClient(client, "mem");
    expect(s.tools.map((t) => t.name)).toEqual(["first", "second"]);
    expect(s.instructions).toBe("Start with first.");
    expect(s.resources?.map((r) => r.uri)).toEqual(["doc://api/index.md"]);
    expect(s.resourceTemplates?.map((r) => r.uriTemplate)).toEqual(["doc://api/{area}.d.ts"]);
    expect(s.prompts?.map((p) => p.name)).toEqual(["build"]);
    expect(s.notes).toBeUndefined();
    await client.close();
  });

  it("records none (not unknown) for capabilities the server does not declare", async () => {
    const client = await connect({});
    const s = await snapshotFromClient(client, "mem");
    expect(s.instructions).toBeNull();
    expect(s.resources).toEqual([]);
    expect(s.resourceTemplates).toEqual([]);
    expect(s.prompts).toEqual([]);
    await client.close();
  });

  it("a failing list is a note and an unknown field, not a failed scan", async () => {
    const client = await connect({ resources: true, failTemplates: true });
    const s = await snapshotFromClient(client, "mem");
    expect(s.resourceTemplates).toBeUndefined();
    expect(s.resources).toHaveLength(1);
    expect(s.notes?.[0]).toMatch(/resources\/templates\/list failed: .*templates are broken/);
    await client.close();
  });
});

describe("readAllPages", () => {
  it("stops a server that never stops paging", async () => {
    await expect(readAllPages("tools/list", async () => ({ items: [1], nextCursor: "again" }))).rejects.toThrow(/still paging/);
  });
});

describe("snapshotFromFile", () => {
  const write = async (body: unknown) => {
    const dir = await mkdtemp(join(tmpdir(), "mcpgrade-"));
    const path = join(dir, "snap.json");
    await writeFile(path, JSON.stringify(body));
    return path;
  };

  it("keeps an old snapshot's missing fields unknown", async () => {
    const s = await snapshotFromFile(await write({ tools: [{ name: "a" }] }));
    expect(s.instructions).toBeUndefined();
    expect(s.resources).toBeUndefined();
  });

  it("reads instructions, resources, templates and prompts when present", async () => {
    const s = await snapshotFromFile(await write({
      tools: [{ name: "a" }], instructions: null, resources: [{ uri: "x://1" }], resourceTemplates: [], prompts: [{ name: "p" }],
    }));
    expect(s.instructions).toBeNull();
    expect(s.resources).toHaveLength(1);
    expect(s.resourceTemplates).toEqual([]);
    expect(s.prompts).toHaveLength(1);
  });

  it("still takes a bare tools array", async () => {
    const s = await snapshotFromFile(await write([{ name: "a" }]));
    expect(s.tools).toHaveLength(1);
    expect(s.instructions).toBeUndefined();
  });
});

describe("snapshotToJson", () => {
  it("round-trips through snapshotFromFile, keeping unknown fields unknown", async () => {
    const { snapshotToJson } = await import("../src/introspect.js");
    const dir = await mkdtemp(join(tmpdir(), "mcpgrade-"));
    const path = join(dir, "saved.json");
    const s = { source: "x", serverName: "srv", tools: [{ name: "a" }], instructions: null, resources: [{ uri: "doc://1" }] };
    await writeFile(path, snapshotToJson(s));
    const back = await snapshotFromFile(path);
    expect(back).toEqual({ source: path, serverName: "srv", tools: [{ name: "a" }], instructions: null, resources: [{ uri: "doc://1" }] });
    expect(back.prompts).toBeUndefined();
  });
});
