import type { ToolDef } from "../types.js";
import type { EvalOptions, EvalTask } from "./types.js";
export declare function parseStringArray(raw: string): string[];
export declare function synthesizeTasks(tools: ToolDef[], opts: EvalOptions): Promise<EvalTask[]>;
