/* ─── Scoring Engine ─── */

import {
  FileInfo,
  Category,
  CategoryScore,
  LintResult,
  Diagnostic,
  CATEGORY_WEIGHTS,
} from "./types";
import { allRules } from "./rules";

/**
 * Run all rules and compute scores
 */
export function lint(workspacePath: string, files: FileInfo[]): LintResult {
  // Run all rules
  const allDiagnostics: Diagnostic[] = [];
  for (const rule of allRules) {
    try {
      const diagnostics = rule.check(files);
      allDiagnostics.push(...diagnostics);
    } catch (e) {
      // Rule failed — skip silently
      console.error(`Rule ${rule.id} failed:`, e);
    }
  }

  // Group by category
  const categories: Category[] = [
    "structure",
    "clarity",
    "completeness",
    "security",
    "consistency",
  ];

  const categoryScores: CategoryScore[] = categories.map((cat) => {
    const catDiagnostics = allDiagnostics.filter((d) => d.category === cat);
    const score = computeCategoryScore(cat, catDiagnostics, files);

    return {
      category: cat,
      score,
      weight: CATEGORY_WEIGHTS[cat],
      diagnostics: catDiagnostics,
    };
  });

  // Compute total weighted score
  const totalScore = Math.round(
    categoryScores.reduce((sum, cs) => sum + cs.score * cs.weight, 0)
  );

  return {
    workspace: workspacePath,
    files,
    categories: categoryScores,
    totalScore,
    diagnostics: allDiagnostics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compute score for a category based on diagnostics
 */
function computeCategoryScore(
  category: Category,
  diagnostics: Diagnostic[],
  files: FileInfo[]
): number {
  // Start at 100, deduct for issues
  let score = 100;

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const infos = diagnostics.filter((d) => d.severity === "info");

  // Deductions
  score -= errors.length * 15; // errors are severe
  score -= warnings.length * 8; // warnings are moderate
  score -= infos.length * 3; // infos are minor

  // Bonus points for good practices (category-specific)
  score += computeBonus(category, files);

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Bonus points for positive signals
 */
function computeBonus(category: Category, files: FileInfo[]): number {
  let bonus = 0;

  switch (category) {
    case "structure":
      // Bonus for modular files
      const mdFiles = files.filter((f) => f.name.endsWith(".md"));
      if (mdFiles.length >= 3) bonus += 5;
      if (mdFiles.length >= 5) bonus += 5;
      break;

    case "clarity":
      // Bonus for having examples
      const hasExamples = files.some(
        (f) => f.content.includes("```") || /example/i.test(f.content)
      );
      if (hasExamples) bonus += 5;
      break;

    case "completeness":
      // Bonus for having all key files
      const keyFiles = ["SOUL.md", "IDENTITY.md", "USER.md", "TOOLS.md", "SECURITY.md"];
      const foundKeys = keyFiles.filter((k) =>
        files.some((f) => f.name === k)
      ).length;
      bonus += foundKeys * 2;
      break;

    case "security":
      // Bonus for having security file
      if (files.some((f) => f.name === "SECURITY.md")) bonus += 5;
      // Bonus for injection defense
      const allContent = files.map((f) => f.content).join("\n");
      if (/inject|jailbreak/i.test(allContent)) bonus += 5;
      break;

    case "consistency":
      // Bonus for consistent naming
      const rootMd = files.filter(
        (f) => f.name.endsWith(".md") && !f.name.includes("/")
      );
      const allUpper = rootMd.every(
        (f) => f.name === f.name.toUpperCase().replace(/\.MD$/, ".md")
      );
      if (allUpper && rootMd.length > 1) bonus += 5;
      break;
  }

  return bonus;
}
