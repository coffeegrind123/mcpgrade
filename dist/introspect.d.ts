import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerSnapshot } from "./types.js";
/**
 * Load a snapshot from a JSON file: {"tools":[...]} or a raw tools array. The optional
 * fields (instructions, resources, resourceTemplates, prompts) are taken when present;
 * an absent field stays undefined, which the rules read as "not captured", never as "none".
 */
export declare function snapshotFromFile(path: string): Promise<ServerSnapshot>;
/** Follow nextCursor until the list ends. */
export declare function readAllPages<T>(what: string, fetchPage: (cursor: string | undefined) => Promise<{
    items: T[];
    nextCursor?: string;
}>): Promise<T[]>;
/**
 * Everything a connected server advertises. Tools are required: a failure there fails the
 * scan. The other lists are read only when the server declares the capability; a list call
 * that fails is recorded in notes and its field left undefined (not captured).
 */
export declare function snapshotFromClient(client: Client, source: string): Promise<ServerSnapshot>;
/**
 * Connect to a live MCP server over HTTP and take a snapshot.
 *
 * Tries streamable HTTP first, then falls back to SSE — many hosted servers
 * still only speak the older transport. Custom headers (auth tokens) are
 * forwarded to both.
 *
 * Secrets note: headers are never stored on the snapshot or echoed in output.
 */
export declare function snapshotFromHttp(url: string, headers?: Record<string, string>): Promise<ServerSnapshot>;
/** Spawn a local MCP server over stdio and take a snapshot. */
export declare function snapshotFromStdio(command: string): Promise<ServerSnapshot>;
export declare function takeSnapshot(opts: {
    target?: string;
    stdio?: string;
    snapshot?: string;
    headers?: Record<string, string>;
}): Promise<ServerSnapshot>;
/**
 * The snapshot as a file snapshotFromFile reads back unchanged: what --save-snapshot writes, so
 * other tools can grade exactly what this run graded. Fields that were not captured stay out.
 * Auth headers are never part of a snapshot.
 */
export declare function snapshotToJson(s: ServerSnapshot): string;
