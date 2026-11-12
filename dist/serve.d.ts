import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare class TargetRejectedError extends Error {
}
/** Validates a target string before it reaches the process spawner. */
export declare function assertTargetAllowed(target: string): void;
export declare function createServer(): McpServer;
export declare function serve(): Promise<void>;
/** Exposed for tests: the rule ids the static engine actually implements. */
export declare const implementedRuleIds: string[];
