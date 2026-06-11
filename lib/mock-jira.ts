export type JiraStatus =
  | "Open"
  | "In Progress"
  | "In Review"
  | "Done"
  | "Unknown";

export type JiraType = "Story" | "Bug" | "Task" | "Epic" | "Unknown";

export interface JiraTicketDetail {
  id: string;
  title: string;
  status: JiraStatus;
  type: JiraType;
  assignee: string;
  summary: string;
  /** "real" when the ticket exists in the mock dataset; "fallback" otherwise. */
  source: "real" | "fallback";
}

export const MOCK_JIRA: Record<
  string,
  Omit<JiraTicketDetail, "id" | "source">
> = {
  "GW-1245": {
    title: "Claim payment display enhancement",
    status: "Done",
    type: "Story",
    assignee: "Mei Ling Tan",
    summary:
      "Added payment panel to claim summary page to improve visibility for claim handlers.",
  },
  "GW-1188": {
    title: "Claim status visibility update",
    status: "In Review",
    type: "Bug",
    assignee: "John Tan",
    summary:
      "Updated claim status display logic to align with latest workflow rules.",
  },
  "GW-2031": {
    title: "Policy overview layout refactor",
    status: "Done",
    type: "Story",
    assignee: "Sarah Lee",
    summary:
      "Refactored policy overview page to improve Jutro layout consistency.",
  },
  "GW-3420": {
    title: "Billing search table enhancement",
    status: "In Progress",
    type: "Story",
    assignee: "Arif Rahman",
    summary:
      "Enhanced billing search results with improved filtering and table layout.",
  },
  "GW-1102": {
    title: "Accessibility audit — claim summary",
    status: "In Review",
    type: "Task",
    assignee: "Jacqueline Okonkwo",
    summary:
      "Refactored ClaimSummary grid layout to satisfy keyboard navigation and screen reader requirements.",
  },
  "GW-1255": {
    title: "Payment status badge palette refresh",
    status: "In Review",
    type: "Story",
    assignee: "Priya Singh",
    summary:
      "Refreshed payment status badge palette to align with the new claims design system tokens.",
  },
  "GW-1290": {
    title: "Billing search export to CSV",
    status: "Done",
    type: "Story",
    assignee: "Rosa Diaz",
    summary:
      "Added a CSV export action to billing search results so finance can share filtered datasets externally.",
  },
  "GW-1374": {
    title: "Premium locale formatting",
    status: "Done",
    type: "Bug",
    assignee: "Erika Fischer",
    summary:
      "Fixed premium amount formatting for international locales by routing through the shared Intl helper.",
  },
  "GW-1399": {
    title: "Coverage tab — surface endorsement status",
    status: "In Progress",
    type: "Story",
    assignee: "Kenji Tanaka",
    summary:
      "Wired CoverageTable into the policy detail tab and surfaced endorsement state for underwriters.",
  },
  "GW-1402": {
    title: "Policy overview performance regression",
    status: "Open",
    type: "Bug",
    assignee: "Kenji Tanaka",
    summary:
      "Investigating slow PolicyOverviewPage renders on large policies after the CoverageTable rewire.",
  },
  "GW-9001": {
    title: "Introduce ClaimStatusBanner",
    status: "Done",
    type: "Story",
    assignee: "Alex Morgan",
    summary:
      "Introduced the ClaimStatusBanner widget so claim status surfaces use a single source of truth.",
  },
  "GW-9002": {
    title: "Add PaymentPanel widget",
    status: "Done",
    type: "Story",
    assignee: "Brianna Reeves",
    summary:
      "Added the PaymentPanel widget — totals, payment table, and the issue-payment CTA — for reuse across claim surfaces.",
  },
  "GW-9003": {
    title: "Compose ClaimSummaryPage from banner and panel",
    status: "Done",
    type: "Story",
    assignee: "Cara Dennison",
    summary:
      "Composed ClaimSummaryPage on top of ClaimStatusBanner and PaymentPanel so the claim summary surface is built from shared primitives.",
  },
  "CLAIM-1188": {
    title: "ClaimSummaryPage formatting tweak",
    status: "Done",
    type: "Task",
    assignee: "Alex Morgan",
    summary:
      "Minor formatting tweak on ClaimSummaryPage to align spacing with the latest design tokens.",
  },
  "JUTRO-223": {
    title: "Scaffold remaining Jutro sample pages",
    status: "Done",
    type: "Story",
    assignee: "Devon Park",
    summary:
      "Scaffolded the PolicyOverviewPage and BillingSearchPage Jutro samples to seed the design-system showcase.",
  },
};

const FALLBACK: Omit<JiraTicketDetail, "id" | "source"> = {
  title: "Ticket details not available",
  status: "Unknown",
  type: "Unknown",
  assignee: "Unknown",
  summary:
    "This ticket ID was extracted from Git history but no mock details were found.",
};

export function lookupTickets(ids: string[]): JiraTicketDetail[] {
  const seen = new Set<string>();
  const out: JiraTicketDetail[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const hit = MOCK_JIRA[id];
    if (hit) {
      out.push({ id, ...hit, source: "real" });
    } else {
      out.push({ id, ...FALLBACK, source: "fallback" });
    }
  }
  return out;
}

const TICKET_ID_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export function isValidTicketId(id: string): boolean {
  return TICKET_ID_RE.test(id);
}
