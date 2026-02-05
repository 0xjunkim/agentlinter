/* ─── Markdown Parser ─── */

import { FileInfo, Section } from "./types";
import * as fs from "fs";
import * as path from "path";

const AGENT_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "SECURITY.md",
  "FORMATTING.md",
  "HEARTBEAT.md",
  "MEMORY.md",
  "BOOTSTRAP.md",
  ".clauderc",
  ".agentlinterrc",
];

const AGENT_DIRS = [".claude", "claude", ".cursor", ".windsurf"];

/**
 * Scan a workspace for agent configuration files
 */
export function scanWorkspace(workspacePath: string): FileInfo[] {
  const files: FileInfo[] = [];

  // Check root-level files
  for (const fileName of AGENT_FILES) {
    const filePath = path.join(workspacePath, fileName);
    if (fs.existsSync(filePath)) {
      files.push(parseFile(filePath, fileName));
    }
  }

  // Check agent directories
  for (const dir of AGENT_DIRS) {
    const dirPath = path.join(workspacePath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const dirFiles = fs.readdirSync(dirPath);
      for (const fileName of dirFiles) {
        if (fileName.endsWith(".md") || fileName.endsWith(".txt")) {
          const filePath = path.join(dirPath, fileName);
          const relativeName = `${dir}/${fileName}`;
          files.push(parseFile(filePath, relativeName));
        }
      }
    }
  }

  // Also check for compound/ directory (Clawdbot pattern)
  const compoundDir = path.join(workspacePath, "compound");
  if (fs.existsSync(compoundDir) && fs.statSync(compoundDir).isDirectory()) {
    const compoundFiles = fs.readdirSync(compoundDir);
    for (const fileName of compoundFiles) {
      if (fileName.endsWith(".md")) {
        const filePath = path.join(compoundDir, fileName);
        files.push(parseFile(filePath, `compound/${fileName}`));
      }
    }
  }

  return files;
}

/**
 * Parse a single markdown file
 */
export function parseFile(filePath: string, name: string): FileInfo {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const sections = parseSections(lines);

  return { name, path: filePath, content, lines, sections };
}

/**
 * Extract sections from markdown by headings
 */
function parseSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headingMatch) {
      // Close previous section
      if (currentSection) {
        currentSection.endLine = i - 1;
        currentSection.content = lines
          .slice(currentSection.startLine, i)
          .join("\n");
        sections.push(currentSection);
      }

      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        startLine: i,
        endLine: i,
        content: "",
      };
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    currentSection.content = lines
      .slice(currentSection.startLine)
      .join("\n");
    sections.push(currentSection);
  }

  return sections;
}
