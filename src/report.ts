import chalk from "chalk";
import type { Report, Severity } from "./types.js";

const SEV_ICON: Record<Severity, string> = { error: "✖", warn: "⚠", info: "ℹ" };
const CAT_LABEL: Record<string, string> = {
  desc: "Descriptions",
  name: "Naming",
  schema: "Schema design",
  token: "Token cost",
  consist: "Consistency",
};

function gradeColor(grade: string): (s: string) => string {
  if (grade === "A") return chalk.green;
  if (grade === "B") return chalk.greenBright;
  if (grade === "C") return chalk.yellow;
  if (grade === "D") return chalk.hex("#ff8800");
  return chalk.red;
}

function sevColor(sev: Severity): (s: string) => string {
  if (sev === "error") return chalk.red;
  if (sev === "warn") return chalk.yellow;
  return chalk.dim;
}

export function renderTerminal(report: Report): string {
  const lines: string[] = [];
  const gc = gradeColor(report.grade);
  lines.push("");
  lines.push(chalk.bold("mcpgrade") + chalk.dim(` — agent usability report`));
  const snap = report.snapshot;
  const parts = [`${snap.toolCount} tools`];
  if (snap.resourceCount !== undefined) parts.push(`${snap.resourceCount} resources`);
  if (snap.resourceTemplateCount !== undefined) parts.push(`${snap.resourceTemplateCount} templates`);
  if (snap.promptCount !== undefined) parts.push(`${snap.promptCount} prompts`);
  if (snap.instructionsChars !== undefined) {
    parts.push(snap.instructionsChars === null ? "no instructions" : `instructions ${snap.instructionsChars} chars`);
  }
  lines.push(chalk.dim(`target: ${snap.source} · ${parts.join(" · ")}`));
  for (const note of snap.notes ?? []) {
    lines.push(chalk.yellow(`  note: ${note}`));
  }
  lines.push("");
  lines.push(gc(chalk.bold(`  ${report.grade}   ${report.totalScore}/100`)));
  lines.push("");
  for (const cat of report.categories) {
    const bar = "█".repeat(Math.round(cat.score / 5)).padEnd(20, "░");
    lines.push(
      `  ${CAT_LABEL[cat.category].padEnd(14)} ${gradeColor(cat.score >= 90 ? "A" : cat.score >= 70 ? "C" : "F")(bar)} ${String(cat.score).padStart(3)}`,
    );
  }
  lines.push("");
  const bySev: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const f of report.findings) bySev[f.severity]++;
  lines.push(
    chalk.dim("  findings: ") +
      chalk.red(`${bySev.error} errors`) + chalk.dim(" · ") +
      chalk.yellow(`${bySev.warn} warnings`) + chalk.dim(" · ") +
      chalk.dim(`${bySev.info} info`),
  );
  lines.push("");
  for (const cat of report.categories) {
    if (cat.findings.length === 0) continue;
    lines.push(chalk.bold(`  ${CAT_LABEL[cat.category]}`));
    for (const f of cat.findings) {
      const c = sevColor(f.severity);
      const tool = f.toolName ? chalk.cyan(` [${f.toolName}]`) : "";
      lines.push(c(`    ${SEV_ICON[f.severity]} ${f.ruleId}`) + tool + ` ${f.message}`);
      lines.push(chalk.dim(`      ↳ ${f.fix}`));
    }
    lines.push("");
  }
  if (report.accepted.length) {
    lines.push(chalk.bold("  Accepted by config (not scored)"));
    for (const f of report.accepted) {
      const tool = f.toolName ? chalk.cyan(` [${f.toolName}]`) : "";
      lines.push(chalk.dim(`    ${f.ruleId}`) + tool + chalk.dim(` ${f.message}`));
      lines.push(chalk.dim(`      ↳ accepted: ${f.reason}`));
    }
    lines.push("");
  }
  if (report.unusedExceptions.length) {
    lines.push(chalk.yellow("  Exceptions that matched nothing (stale config?)"));
    for (const e of report.unusedExceptions) {
      lines.push(chalk.yellow(`    ${e.rule}${e.tool ? ` [${e.tool}]` : ""}: ${e.reason}`));
    }
    lines.push("");
  }
  if (report.findings.length === 0) {
    lines.push(chalk.green("  No findings. Ship it. 🚀"));
    lines.push("");
  }
  return lines.join("\n");
}

export function renderJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
