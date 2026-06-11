export type FileType = "page" | "component" | "hook" | "other";
export type RiskLevel = "low" | "medium" | "high";

export interface Commit {
  id: string;
  message: string;
  author: string;
  date: string;
  ticketId: string;
}

export interface JiraTicket {
  id: string;
  title: string;
  status: "Open" | "In Progress" | "In Review" | "Done";
}

export interface ConfluenceDoc {
  title: string;
  url: string;
  description: string;
}

/** Lightweight descriptor returned by the repository scanner. */
export interface RepoFile {
  id: string;
  name: string;
  /** Path relative to the sample repository root, POSIX separators. */
  path: string;
  type: FileType;
  risk: RiskLevel;
}

/** Per-file analysis content (descriptions, commits, tickets, etc.). */
export interface FileAnalysis {
  description: string;
  aiSummary: string;
  jutroComponents: string[];
  customComponents: string[];
  commits: Commit[];
  jiraTickets: JiraTicket[];
  confluenceDocs: ConfluenceDoc[];
  impactSummary: string;
  dependencies: string[];
  usedBy: string[];
  /** API call sites detected by the static analyzer. */
  apiCalls: string[];
  /** React hooks detected by the static analyzer. */
  hooks: string[];
  /** Components/functions exported by the file. */
  exportedComponents: string[];
  /** True when this analysis is a placeholder generated for an unknown file. */
  isFallback: boolean;
  /** True when the static analyzer succeeded for this file. */
  isAnalyzed: boolean;
}

/** Combined view used by the UI panels. */
export interface FileView extends RepoFile {
  code: string;
  analysis: FileAnalysis;
}

/** Cap-100 numeric score, plus level. Wired up in Phase 8. */
export interface ImpactScoreSnapshot {
  riskScore: number;
  riskLevel: RiskLevel;
  counts: {
    dependencyCount: number;
    usedByCount: number;
    apiCallCount: number;
    customComponentCount: number;
    jutroComponentCount: number;
  };
  explanation: string;
  changeConfidence: { headline: string; detail: string };
}
