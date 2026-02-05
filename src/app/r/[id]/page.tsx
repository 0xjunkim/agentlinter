import { notFound } from "next/navigation";
import ReportPage, { ReportData } from "./ReportClient";

// Demo fallback data (used when id === "demo" or DB unavailable)
const DEMO_DATA: ReportData = {
  id: "demo",
  workspace: "demo-workspace",
  totalScore: 99,
  filesScanned: 27,
  timestamp: "2026-02-05T12:06:47.582Z",
  categories: [
    { name: "Structure", score: 100 },
    { name: "Clarity", score: 96 },
    { name: "Completeness", score: 100 },
    { name: "Security", score: 100 },
    { name: "Consistency", score: 100 },
  ],
  diagnostics: [
    { severity: "info", category: "structure", rule: "structure/heading-hierarchy", file: "compound/agentlinter-plan.md", line: 71, message: "Heading level skipped: h1 → h3. Consider using h2 instead." },
    { severity: "info", category: "structure", rule: "structure/heading-hierarchy", file: "compound/moltbook-evolution.md", line: 19, message: "Heading level skipped: h1 → h3. Consider using h2 instead." },
    { severity: "info", category: "structure", rule: "structure/heading-hierarchy", file: "compound/moltbook-learning.md", line: 28, message: "Heading level skipped: h1 → h3. Consider using h2 instead." },
    { severity: "info", category: "clarity", rule: "clarity/undefined-term", file: "IDENTITY.md", line: 3, message: "Undefined acronym \"MUST\" — define on first use or add to glossary.", fix: "Write it as \"**MUST (Full Name Here)**\" on first mention." },
    { severity: "info", category: "clarity", rule: "clarity/undefined-term", file: "USER.md", line: 3, message: "Undefined acronym \"MUST\" — define on first use or add to glossary.", fix: "Write it as \"**MUST (Full Name Here)**\" on first mention." },
    { severity: "info", category: "clarity", rule: "clarity/undefined-term", file: "TOOLS.md", line: 3, message: "Undefined acronym \"MUST\" — define on first use or add to glossary.", fix: "Write it as \"**MUST (Full Name Here)**\" on first mention." },
    { severity: "info", category: "consistency", rule: "consistency/language-mixing", file: "MEMORY.md", message: "5 mixed-language lines found. Consider standardizing to one language per section.", fix: "Use one language consistently." },
  ],
  files: [
    "AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "TOOLS.md",
    "SECURITY.md", "FORMATTING.md", "HEARTBEAT.md", "MEMORY.md",
    "compound/SUB-AGENTS.md", "compound/agentlinter-plan.md",
    "compound/context-metrics.md", "compound/hivefence-trust-design-analysis.md",
    "compound/moltbook-evolution.md", "compound/moltbook-learning-result.md",
    "compound/moltbook-learning.md", "compound/patterns.md",
    "compound/progress.md", "compound/queue.md",
    "compound/rabbit-hole-result.md", "compound/recurring.md",
    "compound/session-retrospective.md", "compound/simon-chat-buffer.md",
    "compound/subagent-self-heal.md", "compound/twitter-analysis-result.md",
    "compound/voice-ai-solutions-comparison.md", "compound/work-log.md",
  ],
};

async function fetchReport(id: string): Promise<ReportData | null> {
  // Demo shortcut
  if (id === "demo") return DEMO_DATA;

  // Fetch from API (server-side)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/reports/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const raw = await res.json();

    // Transform DB shape → component shape
    return {
      id: raw.id,
      workspace: raw.workspace || "workspace",
      totalScore: raw.score,
      filesScanned: raw.files_scanned || raw.file_names?.length || 0,
      timestamp: raw.created_at || new Date().toISOString(),
      categories: (raw.categories || []).map((c: any) => ({
        name: c.name,
        score: c.score,
      })),
      diagnostics: raw.diagnostics || [],
      files: raw.file_names || [],
      history: raw.history || [],
    };
  } catch (e) {
    console.error("Failed to fetch report:", e);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchReport(id);
  if (!data) return { title: "Report Not Found — AgentLinter" };

  const tier = data.totalScore >= 95 ? "S" : data.totalScore >= 90 ? "A+" : data.totalScore >= 85 ? "A" : data.totalScore >= 80 ? "A-" : data.totalScore >= 75 ? "B+" : "B";

  return {
    title: `${data.totalScore}/100 (${tier}) — AgentLinter Report`,
    description: `Agent workspace scored ${data.totalScore}/100 — ${data.filesScanned} files scanned, ${data.diagnostics.length} issues found.`,
    openGraph: {
      title: `${data.totalScore}/100 (${tier}) — AgentLinter Report`,
      description: `Agent workspace scored ${data.totalScore}/100. ${data.filesScanned} files, ${data.diagnostics.length} issues.`,
    },
    twitter: {
      card: "summary",
      title: `${data.totalScore}/100 (${tier}) — AgentLinter`,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchReport(id);

  if (!data) {
    notFound();
  }

  return <ReportPage data={data} />;
}
