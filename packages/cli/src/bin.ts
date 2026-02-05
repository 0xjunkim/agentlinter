#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { scanWorkspace, lint } from './engine';
import { formatJSON } from './engine/reporter';
import { uploadReport } from './upload';
import { LintResult, Diagnostic } from './engine/types';

const VERSION = "0.1.0";

/* ─── ANSI Colors ─── */
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

async function main() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let jsonOutput = false;
  let share = false;

  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') jsonOutput = true;
    else if (arg === '--share') share = true;
    else if (arg === 'score') continue;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    else if (!arg.startsWith('-')) targetDir = path.resolve(process.cwd(), arg);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`${c.red}Error: Directory not found: ${targetDir}${c.reset}`);
    process.exit(1);
  }

  if (!jsonOutput) {
    console.log(`\n${c.magenta}${c.bold}🔍 AgentLinter${c.reset} ${c.dim}v${VERSION}${c.reset}`);
    console.log(`${c.dim}Scanning: ${targetDir}${c.reset}\n`);
  }

  try {
    const files = scanWorkspace(targetDir);
    if (files.length === 0) {
      if (jsonOutput) {
        console.log(JSON.stringify({ error: "No files found", score: 0 }));
      } else {
        console.log(`${c.yellow}No agent configuration files found (CLAUDE.md, AGENTS.md, etc).${c.reset}`);
      }
      process.exit(0);
    }

    const result = lint(targetDir, files);

    if (jsonOutput) {
      console.log(formatJSON(result));
    } else {
      console.log(formatTerminalColored(result));
    }

    if (share) {
      if (!jsonOutput) console.log(`${c.dim}Uploading report...${c.reset}`);
      const { url } = await uploadReport(result);
      if (jsonOutput) {
        // We already printed JSON. 
        // We can't easily append to the JSON without parsing it back or modifying formatJSON.
        // For CLI tools, usually logs go to stderr if stdout is JSON.
        console.error(`Link: ${url}`);
      } else {
        console.log(`\n🔗 Share your score: ${c.bold}${c.blue}${url}${c.reset}`);
        console.log(`${c.dim}Share on X: https://x.com/intent/tweet?text=${encodeURIComponent(`I scored ${result.totalScore}/100 on AgentLinter! Check it out: ${url}`)}${c.reset}\n`);
      }
    }

  } catch (error) {
    console.error(`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    process.exit(1);
  }
}

function formatTerminalColored(result: LintResult): string {
  const lines: string[] = [];
  
  lines.push(`📁 Workspace: ${c.bold}${result.workspace}${c.reset}`);
  lines.push(`📄 Files: ${result.files.map(f => f.name).join(", ")}`);
  lines.push("");

  // Score
  let scoreColor = c.red;
  let scoreEmoji = "❌";
  if (result.totalScore >= 90) { scoreColor = c.green; scoreEmoji = "🏆"; }
  else if (result.totalScore >= 70) { scoreColor = c.green; scoreEmoji = "✅"; }
  else if (result.totalScore >= 50) { scoreColor = c.yellow; scoreEmoji = "⚠️"; }

  lines.push(`${scoreEmoji} Overall Score: ${c.bold}${scoreColor}${result.totalScore}/100${c.reset}`);
  lines.push("");

  // Categories
  for (const cat of result.categories) {
    const bar = makeBar(cat.score);
    const label = (cat.category.charAt(0).toUpperCase() + cat.category.slice(1)).padEnd(14);
    
    let barColor = c.red;
    if (cat.score >= 80) barColor = c.green;
    else if (cat.score >= 50) barColor = c.yellow;

    lines.push(`  ${label} ${barColor}${bar}${c.reset} ${cat.score}`);
  }
  lines.push("");

  // Diagnostics
  const sorted = [...result.diagnostics].sort((a, b) => {
    const sevScore = { error: 0, warning: 1, info: 2 };
    return (sevScore[a.severity] - sevScore[b.severity]) || a.file.localeCompare(b.file);
  });

  const errors = sorted.filter(d => d.severity === 'error');
  const warnings = sorted.filter(d => d.severity === 'warning');
  
  if (errors.length > 0 || warnings.length > 0) {
      const parts = [];
      if (errors.length) parts.push(`${c.red}${errors.length} error(s)${c.reset}`);
      if (warnings.length) parts.push(`${c.yellow}${warnings.length} warning(s)${c.reset}`);
      lines.push(`📋 ${parts.join(", ")}`);
      lines.push("");
  }

  for (const diag of sorted) {
    if (diag.severity === 'info') continue;

    let icon = "ℹ️  INFO";
    let color = c.blue;
    if (diag.severity === "error") { icon = "❌ ERROR"; color = c.red; }
    else if (diag.severity === "warning") { icon = "⚠️  WARN"; color = c.yellow; }

    const location = diag.line ? `${diag.file}:${diag.line}` : diag.file;
    lines.push(`  ${color}${icon}${c.reset}  ${c.dim}${location}${c.reset}`);
    lines.push(`         ${diag.message}`);
    if (diag.fix) {
      lines.push(`         ${c.cyan}💡 Fix: ${diag.fix}${c.reset}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function makeBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function printHelp() {
  console.log(`
${c.bold}AgentLinter CLI${c.reset}

Usage:
  npx agentlinter [path]
  npx agentlinter score [path]
  npx agentlinter --json
  npx agentlinter --share
`);
}

main().catch(console.error);
