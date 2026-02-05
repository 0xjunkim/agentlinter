/* ─── Consistency Rules (15%) ─── */

import { Rule, Diagnostic } from "../types";

export const consistencyRules: Rule[] = [
  {
    id: "consistency/referenced-files-exist",
    category: "consistency",
    severity: "error",
    description: "Files referenced in agent configs should exist",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      const fileNames = new Set(files.map((f) => f.name));

      // Generic pattern references to skip (e.g., "Check SKILL.md for each" refers to a pattern, not a specific file)
      const PATTERN_REFS = new Set(["SKILL.md", "README.md", "CHANGELOG.md", "LICENSE.md"]);

      for (const file of files) {
        // Find references to other .md files
        const refs = file.content.matchAll(
          /(?:see|read|check|refer to|load|include)\s+[`"']?([A-Z][A-Za-z_-]+\.md)[`"']?/gi
        );

        for (const match of refs) {
          const refName = match[1];
          if (PATTERN_REFS.has(refName)) continue; // skip generic patterns
          if (!fileNames.has(refName) && !fileNames.has(refName.toLowerCase())) {
            diagnostics.push({
              severity: "error",
              category: "consistency",
              rule: this.id,
              file: file.name,
              message: `Referenced file "${refName}" not found in workspace.`,
              fix: `Create ${refName} or remove the reference.`,
            });
          }
        }

        // Also check backtick references like `SOUL.md`
        const backtickRefs = file.content.matchAll(
          /`([A-Z][A-Za-z_-]+\.md)`/g
        );
        for (const match of backtickRefs) {
          const refName = match[1];
          if (PATTERN_REFS.has(refName)) continue; // skip generic patterns
          if (!fileNames.has(refName) && !fileNames.has(refName.toLowerCase())) {
            const alreadyFound = diagnostics.some(
              (d) =>
                d.file === file.name &&
                d.message.includes(`"${refName}"`)
            );
            if (!alreadyFound) {
              diagnostics.push({
                severity: "error",
                category: "consistency",
                rule: this.id,
                file: file.name,
                message: `Referenced file "${refName}" not found in workspace.`,
                fix: `Create ${refName} or remove the reference.`,
              });
            }
          }
        }
      }
      return diagnostics;
    },
  },

  {
    id: "consistency/naming-convention",
    category: "consistency",
    severity: "info",
    description: "File naming should follow a consistent convention",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      const mdFiles = files.filter((f) => f.name.endsWith(".md") && !f.name.includes("/"));

      const upperCase = mdFiles.filter((f) => f.name === f.name.toUpperCase().replace(/\.MD$/, ".md"));
      const lowerCase = mdFiles.filter((f) => f.name === f.name.toLowerCase());
      const mixed = mdFiles.filter(
        (f) => !upperCase.includes(f) && !lowerCase.includes(f)
      );

      if (upperCase.length > 0 && lowerCase.length > 0) {
        diagnostics.push({
          severity: "info",
          category: "consistency",
          rule: this.id,
          file: "(workspace)",
          message: `Mixed file naming: ${upperCase.length} UPPERCASE (${upperCase.map((f) => f.name).join(", ")}), ${lowerCase.length} lowercase (${lowerCase.map((f) => f.name).join(", ")}). Pick one convention.`,
          fix: "Use consistent naming — UPPERCASE.md is the common convention for agent files.",
        });
      }

      return diagnostics;
    },
  },

  {
    id: "consistency/no-duplicate-instructions",
    category: "consistency",
    severity: "warning",
    description: "Same instruction should not appear in multiple files",
    check(files) {
      const diagnostics: Diagnostic[] = [];
      const seenInstructions = new Map<string, string>(); // normalized instruction → file

      // Only check core files for duplicates
      const coreFiles = files.filter(
        (f) =>
          !f.name.startsWith("compound/") &&
          !f.name.startsWith("memory/") &&
          f.name.endsWith(".md")
      );

      for (const file of coreFiles) {
        if (!file.name.endsWith(".md")) continue;

        for (let i = 0; i < file.lines.length; i++) {
          const line = file.lines[i].trim();
          // Only check substantial lines (bullet points, rules)
          if (line.length < 20) continue;
          if (!line.startsWith("-") && !line.startsWith("*") && !line.startsWith(">"))
            continue;

          const normalized = line
            .replace(/^[-*>]\s*/, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

          if (normalized.length < 20) continue;

          const existingFile = seenInstructions.get(normalized);
          if (existingFile && existingFile !== file.name) {
            diagnostics.push({
              severity: "warning",
              category: "consistency",
              rule: this.id,
              file: file.name,
              line: i + 1,
              message: `Duplicate instruction also in ${existingFile}: "${normalized.substring(0, 60)}..."`,
              fix: "Keep the instruction in one place and reference it from other files.",
            });
          } else {
            seenInstructions.set(normalized, file.name);
          }
        }
      }
      return diagnostics;
    },
  },

  {
    id: "consistency/identity-alignment",
    category: "consistency",
    severity: "warning",
    description: "Agent identity should be consistent across files",
    check(files) {
      const diagnostics: Diagnostic[] = [];

      // Only check core identity files
      const identityFiles = files.filter(
        (f) =>
          f.name === "SOUL.md" ||
          f.name === "IDENTITY.md" ||
          f.name === "CLAUDE.md" ||
          f.name === "AGENTS.md"
      );

      // Extract explicit name declarations
      const names = new Map<string, string[]>();

      for (const file of identityFiles) {
        // Look for explicit name declarations with stricter patterns
        const patterns = [
          /\*\*Name:\*\*\s*(.+)/gi,
          /^-\s*\*\*Name:\*\*\s*(.+)/gim,
          /name\s*[:=]\s*['"]([^'"]+)['"]/gi,
          /^#\s+.*?[-—]\s*(.+)/gm, // "# IDENTITY.md - Who Am I?"
        ];

        for (const pattern of patterns) {
          const matches = file.content.matchAll(pattern);
          for (const match of matches) {
            const name = match[1].trim().split(/\s+/).slice(0, 3).join(" ");
            // Filter out common false positives
            if (
              name.length > 2 &&
              name.length < 25 &&
              !/^(the|a|an|this|that|your|my|it|is|are|was|string|function|class)/i.test(name)
            ) {
              if (!names.has(name)) names.set(name, []);
              names.get(name)!.push(file.name);
            }
          }
        }
      }

      // Only warn if we find genuinely conflicting names
      const uniqueNames = [...names.keys()];
      if (uniqueNames.length > 3) {
        diagnostics.push({
          severity: "warning",
          category: "consistency",
          rule: this.id,
          file: "(workspace)",
          message: `Multiple identity names found: ${uniqueNames.join(", ")}. Ensure they refer to the same entity.`,
          fix: "Use a single consistent name for the agent across all files.",
        });
      }

      return diagnostics;
    },
  },
];
