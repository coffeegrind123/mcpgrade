/**
 * Parses `--header "Name: Value"` occurrences plus the MCPGRADE_HEADERS env var
 * (semicolon-separated) into a header map.
 *
 * Header values routinely carry bearer tokens, so they are only ever passed to
 * the transport — never written to the snapshot, the report, or the eval
 * fingerprint. MCP serve mode does not accept headers at all: there, the target
 * is chosen by a model, and a model should not be handing out credentials.
 */
export declare function parseHeaders(flags?: string[]): Record<string, string> | undefined;
