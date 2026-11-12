/**
 * Rule documentation — single source of truth shared by the `rules` command
 * and MCP serve mode. Generated from docs/rules.md by scripts/gen-rule-docs.mjs.
 * Do not edit by hand.
 */
export interface RuleDoc {
  title: string;
  severity: "error" | "warn" | "info";
  category: "descriptions" | "naming" | "schema" | "token-cost" | "consistency" | "programmability";
  /** Why this degrades agent behaviour. */
  why: string;
  /** Concrete remedy, with examples where the docs provide them. */
  fix: string | null;
}

export const RULE_DOCS: Record<string, RuleDoc> = {
  "D001": {
    "title": "Tool is missing a description",
    "severity": "error",
    "category": "descriptions",
    "why": "The description is the model's *only* semantic signal for tool selection — the name alone forces guessing.",
    "fix": "**Bad:** `{\"name\": \"gc_run\"}` **Good:** `\"Run garbage collection on the cache. Use when memory alerts fire. Returns bytes freed.\"`"
  },
  "D002": {
    "title": "Description too short (<30 chars)",
    "severity": "error",
    "category": "descriptions",
    "why": "\"Gets a user.\" tells the model nothing about *when* to prefer this tool over `get_users`. A useful description answers: what it does, when to use it, what it returns.",
    "fix": null
  },
  "D004": {
    "title": "Parameter missing a description",
    "severity": "error",
    "category": "descriptions",
    "why": "The dominant failure in the ecosystem (132/134 errors in one popular server). Type systems know `url: string`; models need *which* URL, format, constraints. zod users: add `.describe()`.",
    "fix": "**Bad:** `\"url\": {\"type\":\"string\"}` **Good:** `\"url\": {\"type\":\"string\",\"description\":\"Full page URL incl. protocol, e.g. https://example.com/pricing\"}`"
  },
  "D005": {
    "title": "Placeholder / dev-leftover text",
    "severity": "warn",
    "category": "descriptions",
    "why": "`TODO`, `TBD`, `lorem`, `my tool` in production descriptions — ships every week.",
    "fix": null
  },
  "D006": {
    "title": "Nearly identical descriptions across tools",
    "severity": "warn",
    "category": "descriptions",
    "why": "If two descriptions are >85% similar, the model picks between them at random. State explicitly when to use one vs. the other.",
    "fix": null
  },
  "D007": {
    "title": "Description doesn't state the return value",
    "severity": "info",
    "category": "descriptions",
    "why": "Models plan multi-step calls based on what a tool yields; say what comes back.",
    "fix": null
  },
  "N001": {
    "title": "Mixed naming conventions",
    "severity": "warn",
    "category": "naming",
    "why": "`get_user` + `createInvoice` in one catalog reads as two half-finished APIs; consistency helps models generalize. snake_case is the de-facto MCP standard.",
    "fix": null
  },
  "N002": {
    "title": "Confusable tool names (edit distance ≤2)",
    "severity": "error",
    "category": "naming",
    "why": "`get_user` vs `get_users` is the classic. Models mix these up measurably — put the distinguishing concept in the name: `get_user_by_id` / `list_users`.",
    "fix": null
  },
  "N003": {
    "title": "Generic verb with no object",
    "severity": "warn",
    "category": "naming",
    "why": "`process`, `handle`, `run`, `execute` — verbs without objects tell the model nothing. Use verb_object: `search_issues`, `create_invoice`.",
    "fix": null
  },
  "N004": {
    "title": "Name and description semantically disjoint",
    "severity": "info",
    "category": "naming",
    "why": "If no meaningful token of the name appears in the description, one of the two is misleading.",
    "fix": null
  },
  "S001": {
    "title": "Missing input schema",
    "severity": "error",
    "category": "schema",
    "why": "Even zero-arg tools must declare `{\"type\":\"object\",\"properties\":{}}` — an absent schema makes argument construction pure guesswork.",
    "fix": null
  },
  "S002": {
    "title": "Parameter has no type",
    "severity": "error",
    "category": "schema",
    "why": "Untyped params get strings, numbers, or hallucinated objects at random.",
    "fix": null
  },
  "S003": {
    "title": "No `required` array",
    "severity": "warn",
    "category": "schema",
    "why": "Without it, the model must guess which params are optional. Declare it even when empty — that's information too.",
    "fix": null
  },
  "S004": {
    "title": "Overly permissive schema",
    "severity": "warn",
    "category": "schema",
    "why": "`additionalProperties: true` or a bare `type: object` invites the model to invent arguments. Close the schema; declare everything.",
    "fix": null
  },
  "S005": {
    "title": "Enum candidates not enumerated",
    "severity": "warn",
    "category": "schema",
    "why": "\"must be one of: active, inactive\" in prose is a constraint the model can violate. `\"enum\": [\"active\",\"inactive\"]` is one it can't.",
    "fix": null
  },
  "S006": {
    "title": "Schema nested >3 levels",
    "severity": "warn",
    "category": "schema",
    "why": "Argument accuracy drops with nesting depth. Flatten or split the tool.",
    "fix": null
  },
  "S007": {
    "title": "More than 8 parameters",
    "severity": "warn",
    "category": "schema",
    "why": "Same story: past ~8 params, argument quality degrades. Split the tool or group related params into one described object.",
    "fix": null
  },
  "S008": {
    "title": "Complex parameter without example",
    "severity": "info",
    "category": "schema",
    "why": "For object/array params, one example in `examples` or an \"e.g.\" in the description measurably improves argument construction. Not reported for a parameter D004 already flags: one undocumented parameter is one defect, and D004's fix asks for the example too.",
    "fix": null
  },
  "I001": {
    "title": "No server instructions",
    "severity": "warn",
    "category": "descriptions",
    "why": "A server with 5 or more tools, or any resources, templates or prompts, that sends no instructions leaves the model to guess where to start and how the parts fit together; most clients never surface resources or prompts on their own. **Fix:** return instructions: where to start, the usual workflow, and where the API and docs live.",
    "fix": null
  },
  "I002": {
    "title": "Instructions longer than 4096 characters",
    "severity": "warn",
    "category": "descriptions",
    "why": "Claude Code keeps the first 4,096 characters of a server's instructions; the rest never reaches the model. **Fix:** front-load what a model needs before its first call and move the rest into resources or a guide.",
    "fix": null
  },
  "T001": {
    "title": "Catalog total >8k tokens",
    "severity": "error",
    "category": "token-cost",
    "why": "Agents pay your entire tools/list *on every request*. 8k tokens of schemas is a tax on every user message. Budget configurable via `.mcpgraderc.json`.",
    "fix": null
  },
  "T002": {
    "title": "Single tool >1.2k tokens",
    "severity": "warn",
    "category": "token-cost",
    "why": "One bloated schema usually means boilerplate descriptions or over-nested structures.",
    "fix": null
  },
  "T003": {
    "title": "Repeated boilerplate across descriptions",
    "severity": "warn",
    "category": "token-cost",
    "why": "The same 40+ char preamble in every description multiplies token cost for zero information gain.",
    "fix": null
  },
  "T004": {
    "title": "More than 25 tools in one server",
    "severity": "info",
    "category": "token-cost",
    "why": "Big catalogs dilute selection accuracy and burn tokens. Split by domain, or gate rare tools behind a mode.",
    "fix": null
  },
  "T005": {
    "title": "15+ tools and no code or batch tool",
    "severity": "info",
    "category": "token-cost",
    "why": "Every capability is its own tool, paid for on every request, and multi-step work takes one call per step. Reported instead of T004 when both apply. **Fix:** expose the API to a code tool (or a batch tool) plus a search tool and keep only the entry points as tools, or split the server by domain. `tokenBudget.sprawlTools` sets the threshold.",
    "fix": null
  },
  "C001": {
    "title": "Tools with heavily overlapping functionality",
    "severity": "warn",
    "category": "consistency",
    "why": "Two tools whose descriptions share >75% of their vocabulary compete for the same intents; the model picks randomly. Merge, or cross-reference (\"for X, use tool_b instead\").",
    "fix": null
  },
  "C002": {
    "title": "Mixed languages across descriptions",
    "severity": "info",
    "category": "consistency",
    "why": "Some tools described in English, others in another language biases selection.",
    "fix": null
  },
  "C003": {
    "title": "Non-actionable error messages (`--probe`)",
    "severity": "warn",
    "category": "consistency",
    "why": "Probed live: called with deliberately invalid args (an empty object where required params exist — a correct server rejects at validation, so no side effects). \"Internal Server Error\" strands the model; \"Missing required parameter 'query'\" lets it self-correct in one turn.",
    "fix": null
  },
  "C004": {
    "title": "Schema not enforced (`--probe`)",
    "severity": "error",
    "category": "consistency",
    "why": "The server *accepted* a call missing all required arguments. Declared `required` that isn't enforced is worse than none — the model trusts it. ---",
    "fix": null
  },
  "P001": {
    "title": "Code tool never names its language",
    "severity": "error",
    "category": "programmability",
    "why": "A model that has to guess between JavaScript and Python writes the wrong one. **Fix:** name the language and its flavour, e.g. \"a JavaScript function body\".",
    "fix": null
  },
  "P002": {
    "title": "Code tool does not say how a result comes back",
    "severity": "warn",
    "category": "programmability",
    "why": "`return`, the last expression, `print`, stdout: each runtime differs, and a program whose value is silently dropped looks like a failure. **Fix:** \"`return` gives the result (any JSON); console.log is captured\".",
    "fix": null
  },
  "P003": {
    "title": "Code tool states no limits",
    "severity": "warn",
    "category": "programmability",
    "why": "Without time, memory or output limits the model cannot size a program, and a killed program reads as a bug. **Fix:** state the limits and what happens at them, or expose them as parameters (`timeout_ms`).",
    "fix": null
  },
  "P004": {
    "title": "Writing code/batch tool does not say what a failure leaves",
    "severity": "warn",
    "category": "programmability",
    "why": "After a failure halfway, the model has to know whether to retry the whole thing or repair partial changes. **Fix:** say whether it rolls back (all-or-nothing).",
    "fix": null
  },
  "P005": {
    "title": "Nothing points at the API",
    "severity": "warn",
    "category": "programmability",
    "why": "The code or batch tool, or the server instructions, must name where the API is described: a search tool, or a documentation URI. **Fix:** \"Find operations with search_api; the typed API is at docs://api/{area}.d.ts\".",
    "fix": null
  },
  "P006": {
    "title": "Documentation URI that matches no listed resource",
    "severity": "warn",
    "category": "programmability",
    "why": "A URI in a code/batch tool description or the instructions that no resource or template matches is a dead end. **Fix:** list the resource, or correct the URI.",
    "fix": null
  },
  "P007": {
    "title": "Batch tool does not state its size limit or result references",
    "severity": "warn",
    "category": "programmability",
    "why": "**Fix:** set `maxItems` (or state the most operations per call) and say how a later operation refers to an earlier result, e.g. `\"$0.id\"`.",
    "fix": null
  },
  "P008": {
    "title": "Writing code/batch tool takes no idempotency key",
    "severity": "info",
    "category": "programmability",
    "why": "A retried call after a timeout may apply twice. **Fix:** accept an operation id and return the first result when it repeats.",
    "fix": null
  },
  "P009": {
    "title": "Code tool has no read-only mode",
    "severity": "info",
    "category": "programmability",
    "why": "Without one, even a pure read needs write access and an approval. **Fix:** `read_only` (or a dry run) that refuses writes, or a separate read-only tool.",
    "fix": null
  }
};
