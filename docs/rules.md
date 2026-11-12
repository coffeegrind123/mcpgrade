# mcpgrade Rules Reference

Every rule links to its rationale. Disagree? Open an issue — the ruleset is
opinionated by design, and disputes make it better. Disable any rule with
`--disable <ID>` or in `.mcpgraderc.json`.

Severities: **error** (breaks agents) · **warn** (degrades agents) · **info** (polish).

References used throughout: [MCP spec — tools](https://modelcontextprotocol.io/specification),
[Anthropic tool-use best practices](https://docs.claude.com/en/docs/build-with-claude/tool-use),
JSON Schema draft-07.

---

## D — Descriptions (weight 30%)

### D001 · error · Tool is missing a description
The description is the model's *only* semantic signal for tool selection —
the name alone forces guessing.
**Bad:** `{"name": "gc_run"}` **Good:** `"Run garbage collection on the cache. Use when memory alerts fire. Returns bytes freed."`

### D002 · error · Description too short (<30 chars)
"Gets a user." tells the model nothing about *when* to prefer this tool over
`get_users`. A useful description answers: what it does, when to use it, what
it returns.

### D004 · error · Parameter missing a description
The dominant failure in the ecosystem (132/134 errors in one popular server).
Type systems know `url: string`; models need *which* URL, format, constraints.
zod users: add `.describe()`. **Bad:** `"url": {"type":"string"}`
**Good:** `"url": {"type":"string","description":"Full page URL incl. protocol, e.g. https://example.com/pricing"}`

### D005 · warn · Placeholder / dev-leftover text
`TODO`, `TBD`, `lorem`, `my tool` in production descriptions — ships every week.

### D006 · warn · Nearly identical descriptions across tools
If two descriptions are >85% similar, the model picks between them at random.
State explicitly when to use one vs. the other.

### D007 · info · Description doesn't state the return value
Models plan multi-step calls based on what a tool yields; say what comes back.

## N — Naming (weight 15%)

### N001 · warn · Mixed naming conventions
`get_user` + `createInvoice` in one catalog reads as two half-finished APIs;
consistency helps models generalize. snake_case is the de-facto MCP standard.

### N002 · error · Confusable tool names (edit distance ≤2)
`get_user` vs `get_users` is the classic. Models mix these up measurably —
put the distinguishing concept in the name: `get_user_by_id` / `list_users`.

### N003 · warn · Generic verb with no object
`process`, `handle`, `run`, `execute` — verbs without objects tell the model
nothing. Use verb_object: `search_issues`, `create_invoice`.

### N004 · info · Name and description semantically disjoint
If no meaningful token of the name appears in the description, one of the two
is misleading.

## S — Schema design (weight 30%)

### S001 · error · Missing input schema
Even zero-arg tools must declare `{"type":"object","properties":{}}` — an
absent schema makes argument construction pure guesswork.

### S002 · error · Parameter has no type
Untyped params get strings, numbers, or hallucinated objects at random.

### S003 · warn · No `required` array
Without it, the model must guess which params are optional. Declare it even
when empty — that's information too.

### S004 · warn · Overly permissive schema
`additionalProperties: true` or a bare `type: object` invites the model to
invent arguments. Close the schema; declare everything.

### S005 · warn · Enum candidates not enumerated
"must be one of: active, inactive" in prose is a constraint the model can
violate. `"enum": ["active","inactive"]` is one it can't.

### S006 · warn · Schema nested >3 levels
Argument accuracy drops with nesting depth. Flatten or split the tool.

### S007 · warn · More than 8 parameters
Same story: past ~8 params, argument quality degrades. Split the tool or
group related params into one described object.

### S008 · info · Complex parameter without example
For object/array params, one example in `examples` or an "e.g." in the
description measurably improves argument construction. Not reported for a
parameter D004 already flags: one undocumented parameter is one defect, and
D004's fix asks for the example too.

## I — Server instructions (scored under Descriptions)

Instructions come back from `initialize` and clients put them in the system
prompt. A snapshot file without an `instructions` field is not graded on these.

### I001 · warn · No server instructions
A server with 5 or more tools, or any resources, templates or prompts, that
sends no instructions leaves the model to guess where to start and how the parts
fit together; most clients never surface resources or prompts on their own.
**Fix:** return instructions: where to start, the usual workflow, and where the
API and docs live.

### I002 · warn · Instructions longer than 4096 characters
Claude Code keeps the first 4,096 characters of a server's instructions; the
rest never reaches the model. **Fix:** front-load what a model needs before its
first call and move the rest into resources or a guide.

## T — Token cost (weight 15%)

### T001 · error · Catalog total >8k tokens
Agents pay your entire tools/list *on every request*. 8k tokens of schemas is
a tax on every user message. Budget configurable via `.mcpgraderc.json`.

### T002 · warn · Single tool >1.2k tokens
One bloated schema usually means boilerplate descriptions or over-nested
structures.

### T003 · warn · Repeated boilerplate across descriptions
The same 40+ char preamble in every description multiplies token cost for
zero information gain.

### T004 · info · More than 25 tools in one server
Big catalogs dilute selection accuracy and burn tokens. Split by domain, or
gate rare tools behind a mode.

### T005 · info · 15+ tools and no code or batch tool
Every capability is its own tool, paid for on every request, and multi-step
work takes one call per step. Reported instead of T004 when both apply.
**Fix:** expose the API to a code tool (or a batch tool) plus a search tool and
keep only the entry points as tools, or split the server by domain.
`tokenBudget.sprawlTools` sets the threshold.

## C — Consistency (weight 10%)

### C001 · warn · Tools with heavily overlapping functionality
Two tools whose descriptions share >75% of their vocabulary compete for the
same intents; the model picks randomly. Merge, or cross-reference ("for X,
use tool_b instead").

### C002 · info · Mixed languages across descriptions
Some tools described in English, others in another language biases selection.

### C003 · warn · Non-actionable error messages (`--probe`)
Probed live: called with deliberately invalid args (an empty object where
required params exist — a correct server rejects at validation, so no side
effects). "Internal Server Error" strands the model; "Missing required
parameter 'query'" lets it self-correct in one turn.

### C004 · error · Schema not enforced (`--probe`)
The server *accepted* a call missing all required arguments. Declared
`required` that isn't enforced is worse than none — the model trusts it.

---

## P — Programmability (code-mode profile, weight 20%)

A code-first server gives the model a few tools and a way to write programs or
batches against its API. These rules check that the model is told enough to get
a program right on the first try. They run only in the **code-mode** profile:
`--profile code-mode`, or `auto` (the default) when the server has a code or a
batch tool. Detection reads parameter names and descriptions:

- **code tool:** a string parameter named `code`, `script`, `source`, `program`,
  a language name, and the like;
- **batch tool:** an array-of-objects parameter named `ops`, `operations`,
  `actions`, `commands`, `steps`, `requests`, `calls`, or any such array on a
  tool whose name contains "batch";
- **search tool:** a `query`-style string parameter on a tool that searches the
  API, operations, functions or docs;
- **API docs:** resources and templates with a TypeScript, JSON Schema, OpenAPI,
  YAML or Markdown type, or an API/schema/docs name.

The report prints what it found. `"roles": {"<tool>": "code" | "batch" |
"search" | "none"}` in `.mcpgraderc.json` corrects it. In code-mode the
category weights become: descriptions 25%, naming 10%, schema 25%, token cost
10%, consistency 10%, programmability 20%. Programmability is normalised by the
number of code, batch and search tools, not by the whole catalog, and N003 does
not apply to the code tool (a generic verb is the convention there).

### P001 · error · Code tool never names its language
A model that has to guess between JavaScript and Python writes the wrong one.
**Fix:** name the language and its flavour, e.g. "a JavaScript function body".

### P002 · warn · Code tool does not say how a result comes back
`return`, the last expression, `print`, stdout: each runtime differs, and a
program whose value is silently dropped looks like a failure.
**Fix:** "`return` gives the result (any JSON); console.log is captured".

### P003 · warn · Code tool states no limits
Without time, memory or output limits the model cannot size a program, and a
killed program reads as a bug. **Fix:** state the limits and what happens at
them, or expose them as parameters (`timeout_ms`).

### P004 · warn · Writing code/batch tool does not say what a failure leaves
After a failure halfway, the model has to know whether to retry the whole thing
or repair partial changes. **Fix:** say whether it rolls back (all-or-nothing).

### P005 · warn · Nothing points at the API
The code or batch tool, or the server instructions, must name where the API is
described: a search tool, or a documentation URI. **Fix:** "Find operations
with search_api; the typed API is at docs://api/{area}.d.ts".

### P006 · warn · Documentation URI that matches no listed resource
A URI in a code/batch tool description or the instructions that no resource or
template matches is a dead end. **Fix:** list the resource, or correct the URI.

### P007 · warn · Batch tool does not state its size limit or result references
**Fix:** set `maxItems` (or state the most operations per call) and say how a
later operation refers to an earlier result, e.g. `"$0.id"`.

### P008 · info · Writing code/batch tool takes no idempotency key
A retried call after a timeout may apply twice. **Fix:** accept an operation id
and return the first result when it repeats.

### P009 · info · Code tool has no read-only mode
Without one, even a pure read needs write access and an approval. **Fix:**
`read_only` (or a dry run) that refuses writes, or a separate read-only tool.

## Exceptions

When a rule does not fit a tool's design, say so in `.mcpgraderc.json` instead
of disabling the rule for every tool:

```json
{ "exceptions": [{ "rule": "S007", "tool": "look", "reason": "one view tool by design" }] }
```

`tool` is optional (omit it to cover the whole server); `reason` is required.
Matched findings are listed as accepted, with the reason, and not scored; an
exception that matches nothing is reported as stale.

## Scoring

Findings are weighted (error 10 / warn 4 / info 1) and **density-normalized**
by tool count: 3 broken tools out of 3 is an F; 3 out of 30 is a dent.
Category scores combine with the weights above into 0–100 and A–F
(A ≥90, B ≥80, C ≥70, D ≥60, F <60).
