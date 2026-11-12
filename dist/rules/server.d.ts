import type { Rule } from "../types.js";
/**
 * Claude Code keeps the first 4,096 characters of a server's instructions; the rest never
 * reaches the model.
 */
export declare const INSTRUCTIONS_MAX_CHARS = 4096;
export declare const I001: Rule;
export declare const I002: Rule;
export declare const serverRules: Rule[];
