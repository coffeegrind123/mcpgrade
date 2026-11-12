import type { ModelClient } from "./types.js";
/** Anthropic Messages API client via fetch — no SDK dependency. */
export declare function anthropicClient(opts: {
    apiKey: string;
    model?: string;
    temperature?: number;
}): ModelClient;
/**
 * OpenAI-compatible chat-completions client — covers DeepSeek, Qwen/DashScope,
 * GLM, OpenRouter, OpenAI, and any other endpoint speaking the same dialect.
 */
export declare function openaiCompatClient(opts: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
}): ModelClient;
/**
 * Deterministic mock client for tests and offline development.
 * - Task synthesis: emits templated requests derived from the tool name.
 * - Selection: picks the tool whose name's tokens overlap the request most;
 *   declines when overlap is zero (so distractors are refused) and asks a
 *   clarifying question on a tie or when the request says details are missing.
 */
export declare function mockClient(): ModelClient;
