/* ─── Clarity Rules (25%) ─── */

import { Rule, Diagnostic } from "../types";

const VAGUE_PATTERNS = [
  { pattern: /\bbe helpful\b/i, suggestion: "Specify HOW to be helpful (e.g., 'provide code examples', 'explain step by step')" },
  { pattern: /\bbe nice\b/i, suggestion: "Define the specific tone (e.g., 'use casual but professional tone')" },
  { pattern: /\bbe smart\b/i, suggestion: "Specify what 'smart' means in context (e.g., 'prioritize accuracy over speed')" },
  { pattern: /\bbe concise\b/i, suggestion: "Set specific limits (e.g., 'keep responses under 3 paragraphs unless asked for more')" },
  { pattern: /\bdo your best\b/i, suggestion: "Define what success looks like specifically" },
  { pattern: /\btry to\b/i, suggestion: "Use direct instructions instead of 'try to' (e.g., 'do X' not 'try to do X')" },
  { pattern: /\bif possible\b/i, suggestion: "Specify the conditions or constraints explicitly" },
  { pattern: /\bas needed\b/i, suggestion: "Define when it's needed with specific triggers" },
  { pattern: /\bwhen appropriate\b/i, suggestion: "Define what 'appropriate' means in your context" },
  { pattern: /\buse common sense\b/i, suggestion: "AI doesn't have 'common sense' — spell out the specific rules" },
  { pattern: /\buse good judgment\b/i, suggestion: "Define the criteria for judgment (e.g., 'prefer X over Y when Z')" },
  { pattern: /\betc\.?\b/i, suggestion: "List all items explicitly — 'etc' leaves AI guessing" },
  { pattern: /\band so on\b/i, suggestion: "Be exhaustive — list all relevant items" },
  { pattern: /\bthings like\b/i, suggestion: "List specific items instead of 'things like'" },
];

const PASSIVE_PATTERNS = [
  { pattern: /\bshould be done\b/i, suggestion: "Use active voice: 'Do X' instead of 'X should be done'" },
  { pattern: /\bit is expected\b/i, suggestion: "Use direct instructions: 'Always do X' instead of 'it is expected'" },
  { pattern: /\bcan be used\b/i, suggestion: "Be direct: 'Use X for Y' instead of 'X can be used'" },
];

export const clarityRules: Rule[] = [
  {
    id: "clarity/no-vague-instructions",
    category: "clarity",
    severity: "warning",
    description: "Instructions should be specific and actionable, not vague",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      // Only check core agent files for vague instructions
      const coreFiles = files.filter(
        (f) =>
          !f.name.startsWith("compound/") &&
          !f.name.startsWith("memory/") &&
          f.name.endsWith(".md")
      );
      for (const file of coreFiles) {
        for (let i = 0; i < file.lines.length; i++) {
          const line = file.lines[i];
          for (const { pattern, suggestion } of VAGUE_PATTERNS) {
            if (pattern.test(line)) {
              diagnostics.push({
                severity: "warning",
                category: "clarity",
                rule: this.id,
                file: file.name,
                line: i + 1,
                message: `Vague instruction: "${line.trim().substring(0, 80)}..."`,
                fix: suggestion,
              });
              break; // one diagnostic per line
            }
          }
        }
      }
      return diagnostics;
    },
  },

  {
    id: "clarity/actionable-instructions",
    category: "clarity",
    severity: "info",
    description: "Prefer active voice and direct instructions",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      for (const file of files) {
        if (!file.name.endsWith(".md")) continue;
        for (let i = 0; i < file.lines.length; i++) {
          const line = file.lines[i];
          for (const { pattern, suggestion } of PASSIVE_PATTERNS) {
            if (pattern.test(line)) {
              diagnostics.push({
                severity: "info",
                category: "clarity",
                rule: this.id,
                file: file.name,
                line: i + 1,
                message: `Passive instruction: "${line.trim().substring(0, 80)}"`,
                fix: suggestion,
              });
              break;
            }
          }
        }
      }
      return diagnostics;
    },
  },

  {
    id: "clarity/has-examples",
    category: "clarity",
    severity: "info",
    description: "Including examples helps the agent understand expected behavior",
    check(files) {
      const mainFile = files.find(
        (f) => f.name === "CLAUDE.md" || f.name === "AGENTS.md"
      );
      if (!mainFile) return [];

      const hasCodeBlock = mainFile.content.includes("```");
      const hasExample =
        /example|e\.g\.|for instance|like this|such as/i.test(mainFile.content);

      if (!hasCodeBlock && !hasExample && mainFile.lines.length > 30) {
        return [
          {
            severity: "info",
            category: "clarity",
            rule: this.id,
            file: mainFile.name,
            message:
              "No examples found. Adding examples (code blocks, sample outputs) helps the agent understand expectations.",
            fix: "Add a ## Examples section or include inline examples with ``` code blocks",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "clarity/no-contradictions",
    category: "clarity",
    severity: "error",
    description: "Instructions within a file should not contradict each other",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      for (const file of files) {
        if (!file.name.endsWith(".md")) continue;

        // Check for "always X" and "never X" contradictions
        const alwaysMatches: { text: string; line: number }[] = [];
        const neverMatches: { text: string; line: number }[] = [];

        for (let i = 0; i < file.lines.length; i++) {
          const line = file.lines[i].toLowerCase();
          const alwaysMatch = line.match(/always\s+(\w+(?:\s+\w+){0,3})/);
          const neverMatch = line.match(/never\s+(\w+(?:\s+\w+){0,3})/);
          if (alwaysMatch) alwaysMatches.push({ text: alwaysMatch[1], line: i + 1 });
          if (neverMatch) neverMatches.push({ text: neverMatch[1], line: i + 1 });
        }

        // Simple contradiction: "always do X" vs "never do X"
        for (const a of alwaysMatches) {
          for (const n of neverMatches) {
            if (a.text === n.text) {
              diagnostics.push({
                severity: "error",
                category: "clarity",
                rule: this.id,
                file: file.name,
                line: n.line,
                message: `Contradiction: "always ${a.text}" (line ${a.line}) vs "never ${n.text}" (line ${n.line})`,
                fix: "Resolve the contradiction — pick one or add conditional logic",
              });
            }
          }
        }
      }
      return diagnostics;
    },
  },

  {
    id: "clarity/instruction-density",
    category: "clarity",
    severity: "info",
    description: "Files with too many instructions may cause confusion",
    check(files) {
      const mainFile = files.find(
        (f) => f.name === "CLAUDE.md" || f.name === "AGENTS.md"
      );
      if (!mainFile) return [];

      // Count imperative sentences (rough heuristic)
      const imperatives = mainFile.lines.filter((l) =>
        /^[-*]\s*(Always|Never|Do|Don't|Must|Should|Ensure|Make sure|Remember|Check)/i.test(
          l.trim()
        )
      ).length;

      if (imperatives > 30) {
        return [
          {
            severity: "info",
            category: "clarity",
            rule: this.id,
            file: mainFile.name,
            message: `${imperatives} imperative instructions found. Consider prioritizing — too many rules can dilute important ones.`,
            fix: "Group instructions by priority. Put critical rules first, nice-to-haves later.",
          },
        ];
      }
      return [];
    },
  },
];
