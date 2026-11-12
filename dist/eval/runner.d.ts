import type { ServerSnapshot } from "../types.js";
import type { EvalOptions, EvalReport, ToolChoice } from "./types.js";
export declare const SELECT_SYSTEM = "You are an AI agent. You are given a catalog of tools and a user request.\nPick the single best tool and arguments. Decline if no tool fits the request.\nIf the request fits more than one tool equally well, or a required value is missing and you would have to guess it, ask one short clarifying question instead of guessing.\nRespond with JSON only, exactly one of:\n{\"tool\": \"<tool_name>\", \"args\": { ... }}\n{\"clarify\": \"<one question for the user>\"}\n{\"tool\": null}";
/**
 * Parse the model's reply. A tool call wins over a clarification if both appear.
 *
 * `malformed` distinguishes a genuine, valid decline from a response that never
 * engaged with the contract at all — no JSON, broken JSON, or JSON with none of
 * the three recognized shapes. A decline must match `{"tool": null}` exactly:
 * any extra key (a stray `args`, an unrelated field) means the response didn't
 * actually produce one of the exact shapes the prompt asks for, so it doesn't
 * earn refusal credit — see `classify()` in outcome.ts.
 */
export declare function parseChoice(raw: string): ToolChoice;
export declare function runEval(snapshot: ServerSnapshot, opts: EvalOptions): Promise<EvalReport>;
