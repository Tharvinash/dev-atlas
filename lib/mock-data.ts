import type { FileAnalysis, RiskLevel } from "./types";

/**
 * Per-file mock analysis keyed by file name (basename).
 * Real source code is now read from sample-jutro-repo/. This module supplies
 * narrative + workflow context (description, commits, tickets, docs, impact);
 * the static analyzer fills in components/dependencies/risk at runtime.
 */
export type MockAnalysisEntry = Omit<
  FileAnalysis,
  "apiCalls" | "hooks" | "exportedComponents" | "isAnalyzed"
> & {
  /** Optional risk override. When omitted, the scanner default is kept. */
  risk?: RiskLevel;
};

export const MOCK_ANALYSIS: Record<string, MockAnalysisEntry> = {
  "ClaimSummaryPage.tsx": {
    risk: "medium",
    description:
      "Top-level claim summary page rendering claimant details, loss data, status, and payment history.",
    jutroComponents: ["Page", "Card", "Grid", "Button"],
    customComponents: ["ClaimStatusBanner", "PaymentPanel"],
    commits: [
      {
        id: "a8f3c91",
        message: "Added payment panel to claim summary",
        author: "p.singh",
        date: "2026-05-22",
        ticketId: "GW-1245",
      },
      {
        id: "7d12e0a",
        message: "Updated claim status display logic",
        author: "m.alvarez",
        date: "2026-05-14",
        ticketId: "GW-1188",
      },
      {
        id: "3c44b2f",
        message: "Refactored ClaimSummary grid layout for accessibility",
        author: "j.okonkwo",
        date: "2026-04-30",
        ticketId: "GW-1102",
      },
    ],
    jiraTickets: [
      { id: "GW-1245", title: "Claim payment display enhancement", status: "Done" },
      { id: "GW-1188", title: "Claim status visibility update", status: "Done" },
      { id: "GW-1102", title: "Accessibility audit — claim summary", status: "In Review" },
    ],
    confluenceDocs: [
      {
        title: "Claim Summary UX Flow",
        url: "https://confluence.example.com/display/CC/Claim+Summary+UX",
        description: "End-to-end UX flow and acceptance criteria for the claim summary surface.",
      },
      {
        title: "Claim Payment Panel Design Notes",
        url: "https://confluence.example.com/display/CC/Payment+Panel+Design",
        description: "Visual and interaction spec for the embedded payment panel.",
      },
    ],
    impactSummary:
      "Changing this page may affect Claim Overview and Payment Review flows. Downstream surfaces include the Adjuster Workspace and the Customer Portal claim view.",
    dependencies: ["ClaimStatusBanner.tsx", "PaymentPanel.tsx"],
    usedBy: ["ClaimOverviewRoute", "AdjusterWorkspace"],
    aiSummary:
      "ClaimSummaryPage is the primary read view for an open claim. It composes Jutro layout primitives with two custom widgets (ClaimStatusBanner, PaymentPanel) and is wired into both the adjuster and customer-facing routes. Recent work focused on payment visibility and status messaging — touching this file has a medium blast radius across the claims domain.",
    isFallback: false,
  },

  "PolicyOverviewPage.tsx": {
    risk: "high",
    description:
      "Top-level policy overview page showing the insured, term, premium, and tabbed coverage detail.",
    jutroComponents: ["Page", "Card", "Grid", "Tabs", "Tab"],
    customComponents: ["CoverageTable", "PolicyHolderCard"],
    commits: [
      {
        id: "5b7a103",
        message: "Wired CoverageTable to policy detail tab",
        author: "k.tanaka",
        date: "2026-05-30",
        ticketId: "GW-1399",
      },
      {
        id: "9af2c44",
        message: "Premium formatting fix for international locales",
        author: "e.fischer",
        date: "2026-05-19",
        ticketId: "GW-1374",
      },
    ],
    jiraTickets: [
      { id: "GW-1399", title: "Coverage tab — surface endorsement status", status: "In Progress" },
      { id: "GW-1374", title: "Premium locale formatting", status: "Done" },
      { id: "GW-1402", title: "Policy overview performance regression", status: "Open" },
    ],
    confluenceDocs: [
      {
        title: "Policy Overview Information Architecture",
        url: "https://confluence.example.com/display/PC/Policy+Overview+IA",
        description: "Tab structure, content hierarchy, and required fields per LOB.",
      },
    ],
    impactSummary:
      "High-risk surface — used by underwriters, CSRs, and the agent portal. Schema changes here cascade into renewals, endorsement, and audit views.",
    dependencies: ["CoverageTable.tsx", "PolicyHolderCard.tsx"],
    usedBy: ["RenewalWizard", "EndorsementFlow", "AgentPortalPolicyRoute"],
    aiSummary:
      "PolicyOverviewPage is a high-traffic, cross-persona surface. It is the canonical entry point into a policy across CSR, underwriter, and agent flows. The recent CoverageTable rewire and an open performance ticket make this a hot area — coordinate with the policy-platform team before deeper structural changes.",
    isFallback: false,
  },

  "BillingSearchPage.tsx": {
    risk: "low",
    description:
      "Billing center search page with invoice filters and a paginated results table.",
    jutroComponents: ["Page", "Card", "SearchInput", "DataTable", "Button"],
    customComponents: ["InvoiceFilterBar"],
    commits: [
      {
        id: "c11ee92",
        message: "Added export action to billing search results",
        author: "r.diaz",
        date: "2026-05-08",
        ticketId: "GW-1290",
      },
    ],
    jiraTickets: [
      { id: "GW-1290", title: "Billing search export to CSV", status: "Done" },
    ],
    confluenceDocs: [
      {
        title: "Billing Search Field Glossary",
        url: "https://confluence.example.com/display/BC/Billing+Search+Fields",
        description: "Field-level definitions for invoice search filters.",
      },
    ],
    impactSummary:
      "Low-risk maintenance surface. Self-contained — only InvoiceFilterBar is shared with the Account Detail page.",
    dependencies: ["InvoiceFilterBar.tsx"],
    usedBy: ["BillingCenterRoute"],
    aiSummary:
      "BillingSearchPage is a thin search-and-list surface backed by a single shared filter bar. Recent activity is light and scoped — safe area for incremental UX improvements.",
    isFallback: false,
  },

  "ClaimStatusBanner.tsx": {
    risk: "low",
    description:
      "Presentational banner that maps a claim status to a Jutro Banner variant and icon.",
    jutroComponents: ["Banner", "Icon"],
    customComponents: [],
    commits: [
      {
        id: "7d12e0a",
        message: "Updated claim status display logic",
        author: "m.alvarez",
        date: "2026-05-14",
        ticketId: "GW-1188",
      },
    ],
    jiraTickets: [
      { id: "GW-1188", title: "Claim status visibility update", status: "Done" },
    ],
    confluenceDocs: [
      {
        title: "Claim Status Vocabulary",
        url: "https://confluence.example.com/display/CC/Claim+Status",
        description: "Canonical status values and their UX representation.",
      },
    ],
    impactSummary:
      "Low-risk leaf component. Used inside ClaimSummaryPage; visual-only, no data dependencies.",
    dependencies: [],
    usedBy: ["ClaimSummaryPage.tsx"],
    aiSummary:
      "ClaimStatusBanner is a thin, status→variant mapper. It is purely presentational and only consumed by ClaimSummaryPage, so changes here are visually scoped to the claim summary surface.",
    isFallback: false,
  },

  "PaymentPanel.tsx": {
    risk: "medium",
    description:
      "Tabular payment history widget with totals and an issue-payment action. Used inside the claim summary.",
    jutroComponents: ["Card", "DataTable", "Button", "Badge"],
    customComponents: [],
    commits: [
      {
        id: "a8f3c91",
        message: "Added payment panel to claim summary",
        author: "p.singh",
        date: "2026-05-22",
        ticketId: "GW-1245",
      },
      {
        id: "1f0b5c2",
        message: "Payment status badge color refresh",
        author: "p.singh",
        date: "2026-05-25",
        ticketId: "GW-1255",
      },
    ],
    jiraTickets: [
      { id: "GW-1245", title: "Claim payment display enhancement", status: "Done" },
      { id: "GW-1255", title: "Payment status badge palette refresh", status: "In Review" },
    ],
    confluenceDocs: [
      {
        title: "Claim Payment Panel Design Notes",
        url: "https://confluence.example.com/display/CC/Payment+Panel+Design",
        description: "Visual and interaction spec for the embedded payment panel.",
      },
    ],
    impactSummary:
      "Medium-risk shared widget. Embedded inside ClaimSummaryPage and the Adjuster payment review modal — visual changes ripple into both surfaces.",
    dependencies: [],
    usedBy: ["ClaimSummaryPage.tsx", "AdjusterPaymentReviewModal"],
    aiSummary:
      "PaymentPanel is a stateful tabular widget that owns payment totals and the issue-payment CTA. It is reused across the claim summary and the adjuster payment review modal — keep the public prop shape stable.",
    isFallback: false,
  },
};

export function getMockAnalysis(fileName: string): MockAnalysisEntry | undefined {
  return MOCK_ANALYSIS[fileName];
}

export function buildFallbackAnalysis(): FileAnalysis {
  return {
    description: "Analysis not available yet",
    aiSummary:
      "No mock analysis is available for this file. Repository scanning is in place; deeper insights (Git history, Jira, Confluence, AI summary) will be generated in a later phase.",
    jutroComponents: [],
    customComponents: [],
    commits: [],
    jiraTickets: [],
    confluenceDocs: [],
    impactSummary: "Impact analysis will be generated in a later phase",
    dependencies: [],
    usedBy: [],
    apiCalls: [],
    hooks: [],
    exportedComponents: [],
    isFallback: true,
    isAnalyzed: false,
  };
}
