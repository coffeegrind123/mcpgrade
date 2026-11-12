/** Token counting with gpt-tokenizer, falling back to a chars/4 estimate. */
let encodeFn = null;
async function loadEncoder() {
    if (encodeFn)
        return;
    try {
        const mod = await import("gpt-tokenizer");
        encodeFn = mod.encode;
    }
    catch {
        encodeFn = null;
    }
}
export async function countTokens(text) {
    await loadEncoder();
    if (encodeFn) {
        try {
            return encodeFn(text).length;
        }
        catch {
            /* fall through */
        }
    }
    return Math.ceil(text.length / 4);
}
export async function countToolTokens(tool) {
    return countTokens(JSON.stringify(tool));
}
