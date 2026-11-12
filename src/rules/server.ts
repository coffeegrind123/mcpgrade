import type { Rule } from "../types.js";

/**
 * Claude Code keeps the first 4,096 characters of a server's instructions; the rest never
 * reaches the model.
 */
export const INSTRUCTIONS_MAX_CHARS = 4096;

/** Below this many tools, and with no resources or prompts, a server can do without instructions. */
const INSTRUCTIONS_EXPECTED_AT_TOOLS = 5;

export const I001: Rule = {
  id: "I001",
  category: "desc",
  severity: "warn",
  title: "No server instructions",
  check(s) {
    // undefined = not captured (an old snapshot file): never graded as missing.
    if (s.instructions === undefined || s.instructions?.trim()) {
      return [];
    }
    const extras = (s.resources?.length ?? 0) + (s.resourceTemplates?.length ?? 0) + (s.prompts?.length ?? 0);
    if (s.tools.length < INSTRUCTIONS_EXPECTED_AT_TOOLS && extras === 0) {
      return [];
    }
    const what = extras
      ? `${s.tools.length} tools plus ${extras} resources, templates or prompts`
      : `${s.tools.length} tools`;
    return [{
      ruleId: "I001", severity: "warn", category: "desc",
      message: `The server sends no instructions, though it has ${what}: nothing tells the model where to start or how the parts fit together.`,
      fix: "Return instructions from initialize: where to start, the usual workflow, and where the API/docs live (resources, a search tool).",
    }];
  },
};

export const I002: Rule = {
  id: "I002",
  category: "desc",
  severity: "warn",
  title: `Instructions longer than ${INSTRUCTIONS_MAX_CHARS} characters`,
  check(s) {
    const n = s.instructions?.length ?? 0;
    if (n <= INSTRUCTIONS_MAX_CHARS) {
      return [];
    }
    return [{
      ruleId: "I002", severity: "warn", category: "desc",
      message: `The instructions are ${n} characters; Claude Code keeps the first ${INSTRUCTIONS_MAX_CHARS}, so the last ${n - INSTRUCTIONS_MAX_CHARS} never reach the model.`,
      fix: `Front-load what a model needs before its first call and move the rest into resources or a guide; stay under ${INSTRUCTIONS_MAX_CHARS} characters.`,
    }];
  },
};

export const serverRules: Rule[] = [I001, I002];
