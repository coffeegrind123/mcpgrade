import { readFile } from "node:fs/promises";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  PromptDef,
  ResourceDef,
  ResourceTemplateDef,
  ServerSnapshot,
  ToolDef,
} from "./types.js";

/** A server paging past this is treated as broken rather than read forever. */
const MAX_PAGES = 100;

/**
 * Load a snapshot from a JSON file: {"tools":[...]} or a raw tools array. The optional
 * fields (instructions, resources, resourceTemplates, prompts) are taken when present;
 * an absent field stays undefined, which the rules read as "not captured", never as "none".
 */
export async function snapshotFromFile(path: string): Promise<ServerSnapshot> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  const tools: ToolDef[] = raw.tools ?? raw;
  if (!Array.isArray(tools)) {
    throw new Error(`Snapshot file must contain a "tools" array: ${path}`);
  }
  if (Array.isArray(raw)) {
    return { source: path, tools };
  }

  const snapshot: ServerSnapshot = { source: path, serverName: raw.serverName, tools };
  if ("instructions" in raw) {
    snapshot.instructions = typeof raw.instructions === "string" ? raw.instructions : null;
  }
  for (const key of ["resources", "resourceTemplates", "prompts"] as const) {
    if (Array.isArray(raw[key])) {
      snapshot[key] = raw[key];
    }
  }
  return snapshot;
}

/** Follow nextCursor until the list ends. */
export async function readAllPages<T>(
  what: string,
  fetchPage: (cursor: string | undefined) => Promise<{ items: T[]; nextCursor?: string }>,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { items, nextCursor } = await fetchPage(cursor);
    out.push(...items);
    if (!nextCursor) {
      return out;
    }
    cursor = nextCursor;
  }
  throw new Error(`${what}: still paging after ${MAX_PAGES} pages`);
}

/**
 * Everything a connected server advertises. Tools are required: a failure there fails the
 * scan. The other lists are read only when the server declares the capability; a list call
 * that fails is recorded in notes and its field left undefined (not captured).
 */
export async function snapshotFromClient(client: Client, source: string): Promise<ServerSnapshot> {
  const tools = await readAllPages<ToolDef>("tools/list", async (cursor) => {
    const r = await client.listTools(cursor ? { cursor } : undefined);
    return { items: r.tools as ToolDef[], nextCursor: r.nextCursor };
  });

  const caps = client.getServerCapabilities() ?? {};
  const notes: string[] = [];
  const optional = async <T>(what: string, offered: boolean, read: () => Promise<T[]>) => {
    if (!offered) {
      return [] as T[];
    }
    try {
      return await read();
    } catch (err) {
      notes.push(`${what} failed: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  };

  const resources = await optional<ResourceDef>("resources/list", !!caps.resources, () =>
    readAllPages("resources/list", async (cursor) => {
      const r = await client.listResources(cursor ? { cursor } : undefined);
      return { items: r.resources as ResourceDef[], nextCursor: r.nextCursor };
    }));
  const resourceTemplates = await optional<ResourceTemplateDef>("resources/templates/list", !!caps.resources, () =>
    readAllPages("resources/templates/list", async (cursor) => {
      const r = await client.listResourceTemplates(cursor ? { cursor } : undefined);
      return { items: r.resourceTemplates as ResourceTemplateDef[], nextCursor: r.nextCursor };
    }));
  const prompts = await optional<PromptDef>("prompts/list", !!caps.prompts, () =>
    readAllPages("prompts/list", async (cursor) => {
      const r = await client.listPrompts(cursor ? { cursor } : undefined);
      return { items: r.prompts as PromptDef[], nextCursor: r.nextCursor };
    }));

  return {
    source,
    serverName: client.getServerVersion()?.name,
    tools,
    instructions: client.getInstructions() ?? null,
    resources,
    resourceTemplates,
    prompts,
    ...(notes.length ? { notes } : {}),
  };
}

/**
 * Connect to a live MCP server over HTTP and take a snapshot.
 *
 * Tries streamable HTTP first, then falls back to SSE — many hosted servers
 * still only speak the older transport. Custom headers (auth tokens) are
 * forwarded to both.
 *
 * Secrets note: headers are never stored on the snapshot or echoed in output.
 */
export async function snapshotFromHttp(
  url: string,
  headers?: Record<string, string>,
): Promise<ServerSnapshot> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const requestInit = headers && Object.keys(headers).length ? { headers } : undefined;

  const connect = async (kind: "streamable" | "sse") => {
    const client = new Client({ name: "mcpgrade", version: "0.3.1" });
    let transport;
    if (kind === "streamable") {
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );
      transport = new StreamableHTTPClientTransport(new URL(url), { requestInit });
    } else {
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      transport = new SSEClientTransport(new URL(url), {
        requestInit,
        eventSourceInit: requestInit
          ? {
              fetch: (input: string | URL | Request, init?: RequestInit) =>
                fetch(input, { ...init, headers: { ...init?.headers, ...headers } }),
            }
          : undefined,
      } as never);
    }
    await client.connect(transport);
    try {
      return await snapshotFromClient(client, url);
    } finally {
      await client.close();
    }
  };

  try {
    return await connect("streamable");
  } catch (streamableError) {
    try {
      return await connect("sse");
    } catch {
      // Report the primary failure — the SSE attempt is a fallback, not the story.
      throw streamableError;
    }
  }
}

/** Spawn a local MCP server over stdio and take a snapshot. */
export async function snapshotFromStdio(command: string): Promise<ServerSnapshot> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import(
    "@modelcontextprotocol/sdk/client/stdio.js"
  );
  const [cmd, ...args] = command.split(/\s+/);
  const client = new Client({ name: "mcpgrade", version: "0.1.0" });
  // Pass through the full environment: real servers need their API keys etc.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
  const transport = new StdioClientTransport({ command: cmd, args, env });
  await client.connect(transport);
  try {
    return await snapshotFromClient(client, command);
  } finally {
    await client.close();
  }
}

export async function takeSnapshot(opts: {
  target?: string;
  stdio?: string;
  snapshot?: string;
  headers?: Record<string, string>;
}): Promise<ServerSnapshot> {
  if (opts.snapshot) return snapshotFromFile(opts.snapshot);
  if (opts.stdio) return snapshotFromStdio(opts.stdio);
  if (opts.target) {
    if (/^https?:\/\//.test(opts.target)) return snapshotFromHttp(opts.target, opts.headers);
    if (opts.target.endsWith(".json")) return snapshotFromFile(opts.target);
    return snapshotFromStdio(opts.target);
  }
  throw new Error("No target. Pass a URL, a command via --stdio, or --snapshot file.json");
}
