import type { JsonSchema } from "../types.js";
/**
 * Minimal JSON-schema argument validator: required fields, primitive types,
 * enums. Deliberately not a full validator — we measure whether the model
 * produced *plausibly correct* args, not full spec conformance.
 */
export declare function validateArgs(schema: JsonSchema | undefined, args: Record<string, unknown> | null): boolean;
