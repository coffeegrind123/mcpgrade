/** A JSON-Schema-ish object as served by MCP tools/list. Kept loose on purpose. */
export interface JsonSchema {
    type?: string | string[];
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    enum?: unknown[];
    items?: JsonSchema | JsonSchema[];
    additionalProperties?: boolean | JsonSchema;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    examples?: unknown[];
    [key: string]: unknown;
}
export interface ToolDef {
    name: string;
    description?: string;
    inputSchema?: JsonSchema;
    annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        [key: string]: unknown;
    };
}
export interface ResourceDef {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
}
export interface ResourceTemplateDef {
    uriTemplate: string;
    name?: string;
    description?: string;
    mimeType?: string;
}
export interface PromptDef {
    name: string;
    description?: string;
    arguments?: {
        name: string;
        description?: string;
        required?: boolean;
    }[];
}
export interface ServerSnapshot {
    source: string;
    serverName?: string;
    tools: ToolDef[];
    instructions?: string | null;
    resources?: ResourceDef[];
    resourceTemplates?: ResourceTemplateDef[];
    prompts?: PromptDef[];
    /** What could not be read, e.g. a list call the server rejected. */
    notes?: string[];
}
export type Severity = "error" | "warn" | "info";
export type Category = "desc" | "name" | "schema" | "token" | "consist" | "prog";
export interface Finding {
    ruleId: string;
    severity: Severity;
    category: Category;
    toolName?: string;
    /** The top-level parameter a finding is about, when it is about one. */
    param?: string;
    message: string;
    fix: string;
}
export interface Rule {
    id: string;
    category: Category;
    severity: Severity;
    title: string;
    docsUrl?: string;
    check(snapshot: ServerSnapshot): Finding[];
}
export interface CategoryScore {
    category: Category;
    score: number;
    findings: Finding[];
}
/** A rule the config says does not apply, to one tool or to the whole server, and why. */
export interface RuleException {
    rule: string;
    tool?: string;
    reason: string;
}
export interface AcceptedFinding extends Finding {
    reason: string;
}
export interface Report {
    snapshot: {
        source: string;
        serverName?: string;
        toolCount: number;
        /** Length of the server instructions; null = none sent, absent = not captured. */
        instructionsChars?: number | null;
        resourceCount?: number;
        resourceTemplateCount?: number;
        promptCount?: number;
        notes?: string[];
    };
    /** classic, or code-mode (scores Programmability); see roles.ts. */
    profile: "classic" | "code-mode";
    /** Detected (or configured) tool roles and API docs. */
    roles: {
        code: string[];
        batch: string[];
        search: string[];
        docs: string[];
    };
    totalScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    categories: CategoryScore[];
    /** Scored findings. */
    findings: Finding[];
    /** Findings matched by a config exception: listed with the reason, not scored. */
    accepted: AcceptedFinding[];
    /** Exceptions that matched nothing: stale config worth deleting. */
    unusedExceptions: RuleException[];
    /**
     * Not scored. What the tool list costs per request, and, when the config declares how many
     * operations the API offers, how many of them each 1k catalog tokens reaches.
     */
    reach?: {
        catalogTokens: number;
        apiOperations?: number;
        operationsPer1kTokens?: number;
    };
}
export declare const CATEGORY_WEIGHTS: Record<Category, number>;
/** code-mode makes room for Programmability by scaling the classic weights down to 80%. */
export declare const CODE_MODE_WEIGHTS: Record<Category, number>;
export declare const SEVERITY_PENALTY: Record<Severity, number>;
