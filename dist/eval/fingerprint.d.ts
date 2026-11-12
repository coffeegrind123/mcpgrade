import type { ServerSnapshot } from "../types.js";
import type { EnvFingerprint, EvalOptions } from "./types.js";
/**
 * Bump when the selection system prompt changes in a way that could move
 * scores. Two results with different promptVersion are not comparable.
 */
export declare const PROMPT_VERSION = 2;
/**
 * Bump when the shape of the tool catalog handed to the model changes
 * (field set, ordering, JSON formatting).
 */
export declare const SERIALIZER_VERSION = 1;
/** How the catalog shown to the model is assembled. */
export declare const CATALOG_POLICY = "full-catalog-single-shot";
/**
 * Content hash of the exact catalog the model saw. Any schema drift —
 * a renamed tool, an added parameter, a reworded description — changes it,
 * which is what makes two runs comparable or visibly incomparable.
 */
export declare function catalogHash(serializedCatalog: string): string;
export declare function buildFingerprint(args: {
    snapshot: ServerSnapshot;
    opts: EvalOptions;
    serializedCatalog: string;
    systemPrompt: string;
}): EnvFingerprint;
/** True when two runs are directly comparable (same server, model, harness). */
export declare function comparable(a: EnvFingerprint, b: EnvFingerprint): boolean;
