import type { JsonSchema } from "../types.js";
export declare function levenshtein(a: string, b: string): number;
/** Similarity in [0,1] based on normalized edit distance. */
export declare function similarity(a: string, b: string): number;
/** Lowercased content words (>2 chars, no stopwords) of a text. */
export declare function wordSet(text: string): Set<string>;
export declare function jaccard(a: Set<string>, b: Set<string>): number;
export declare function schemaDepth(schema: JsonSchema | undefined, depth?: number): number;
export declare function namingStyle(name: string): "snake" | "camel" | "kebab" | "other";
export declare function walkParams(schema: JsonSchema | undefined, cb: (name: string, param: JsonSchema) => void): void;
