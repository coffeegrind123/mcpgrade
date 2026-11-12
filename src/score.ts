import type { Profile, Roles } from "./roles.js";
import {
  CATEGORY_WEIGHTS,
  CODE_MODE_WEIGHTS,
  SEVERITY_PENALTY,
  type AcceptedFinding,
  type Category,
  type CategoryScore,
  type Finding,
  type Report,
  type RuleException,
  type ServerSnapshot,
} from "./types.js";

const CATEGORIES: Category[] = ["desc", "name", "schema", "token", "consist"];
const NO_ROLES: Roles = { code: [], batch: [], search: [], docs: [] };

/**
 * Density-based scoring: penalties are normalized by catalog size, so
 * 3 broken tools out of 3 is catastrophic while 3 out of 30 is a dent.
 * Denominator: toolCount * 10 penalty points = score 0.
 */
function categoryScore(findings: Finding[], toolCount: number): number {
  const penalty = findings.reduce((acc, f) => acc + SEVERITY_PENALTY[f.severity], 0);
  const capacity = Math.max(toolCount, 1) * 10;
  return Math.max(0, Math.round(100 * (1 - penalty / capacity)));
}

function grade(score: number): Report["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function buildReport(
  snapshot: ServerSnapshot,
  findings: Finding[],
  extra: {
    accepted?: AcceptedFinding[];
    unusedExceptions?: RuleException[];
    profile?: Profile;
    roles?: Roles;
    reach?: Report["reach"];
  } = {},
): Report {
  const profile = extra.profile ?? "classic";
  const roles = extra.roles ?? NO_ROLES;
  const cats = profile === "code-mode" ? [...CATEGORIES, "prog" as const] : CATEGORIES;
  const weights = profile === "code-mode" ? CODE_MODE_WEIGHTS : CATEGORY_WEIGHTS;
  // Programmability findings are about the code, batch and search tools, so they are
  // normalised by how many of those there are, not by the whole catalog.
  const progTools = roles.code.length + roles.batch.length + roles.search.length;
  const categories: CategoryScore[] = cats.map((cat) => {
    const fs = findings.filter((f) => f.category === cat);
    const size = cat === "prog" ? progTools : snapshot.tools.length;
    return { category: cat, score: categoryScore(fs, size), findings: fs };
  });
  const total = Math.round(
    categories.reduce((acc, c) => acc + c.score * weights[c.category], 0),
  );
  return {
    snapshot: {
      source: snapshot.source,
      serverName: snapshot.serverName,
      toolCount: snapshot.tools.length,
      ...(snapshot.instructions !== undefined
        ? { instructionsChars: snapshot.instructions === null ? null : snapshot.instructions.length }
        : {}),
      ...(snapshot.resources ? { resourceCount: snapshot.resources.length } : {}),
      ...(snapshot.resourceTemplates ? { resourceTemplateCount: snapshot.resourceTemplates.length } : {}),
      ...(snapshot.prompts ? { promptCount: snapshot.prompts.length } : {}),
      ...(snapshot.notes?.length ? { notes: snapshot.notes } : {}),
    },
    profile,
    roles,
    totalScore: total,
    grade: grade(total),
    categories,
    findings,
    accepted: extra.accepted ?? [],
    unusedExceptions: extra.unusedExceptions ?? [],
    ...(extra.reach ? { reach: extra.reach } : {}),
  };
}
