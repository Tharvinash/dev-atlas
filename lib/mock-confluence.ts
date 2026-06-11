export interface ConfluenceDocSource {
  title: string;
  url: string;
  description: string;
  relatedKeywords: string[];
}

export interface ConfluenceDocMatch {
  title: string;
  url: string;
  description: string;
  matchedKeywords: string[];
}

export const MOCK_CONFLUENCE: ConfluenceDocSource[] = [
  {
    title: "Claim Summary UX Flow",
    url: "/mock-confluence/claim-summary-ux-flow",
    description:
      "Documents the claim summary screen flow, status display rules, and payment panel behavior.",
    relatedKeywords: [
      "ClaimSummaryPage",
      "ClaimStatusBanner",
      "PaymentPanel",
      "GW-1245",
      "GW-1188",
      "Claim Summary",
    ],
  },
  {
    title: "Claim Payment Panel Design Notes",
    url: "/mock-confluence/claim-payment-panel-design",
    description:
      "UX and implementation notes for displaying claim payment information.",
    relatedKeywords: ["PaymentPanel", "GW-1245", "Claim Payment"],
  },
  {
    title: "Policy Overview Jutro Layout Guide",
    url: "/mock-confluence/policy-overview-layout",
    description:
      "Explains layout decisions for the policy overview page and Jutro component usage.",
    relatedKeywords: [
      "PolicyOverviewPage",
      "GW-2031",
      "Policy Summary",
      "Jutro Layout",
    ],
  },
  {
    title: "Billing Search Experience Notes",
    url: "/mock-confluence/billing-search-experience",
    description:
      "Documents billing search filtering, table layout, and user workflow.",
    relatedKeywords: ["BillingSearchPage", "GW-3420", "Billing Search"],
  },
];

/**
 * Match docs against the supplied keywords. Matching is case-insensitive on
 * the full keyword string. Returns docs that overlap on at least one keyword,
 * each annotated with the keywords (in the original input casing) that hit.
 * Results are ordered by descending overlap count, then by title.
 */
export function searchDocs(keywords: string[]): ConfluenceDocMatch[] {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of keywords) {
    const k = (raw ?? "").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(k);
  }
  if (cleaned.length === 0) return [];

  const lowerCleaned = cleaned.map((k) => k.toLowerCase());

  const results: ConfluenceDocMatch[] = [];
  for (const doc of MOCK_CONFLUENCE) {
    const docLowerSet = new Set(doc.relatedKeywords.map((k) => k.toLowerCase()));
    const matchedKeywords: string[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      if (docLowerSet.has(lowerCleaned[i])) matchedKeywords.push(cleaned[i]);
    }
    if (matchedKeywords.length === 0) continue;
    results.push({
      title: doc.title,
      url: doc.url,
      description: doc.description,
      matchedKeywords,
    });
  }
  results.sort((a, b) => {
    if (b.matchedKeywords.length !== a.matchedKeywords.length) {
      return b.matchedKeywords.length - a.matchedKeywords.length;
    }
    return a.title.localeCompare(b.title);
  });
  return results;
}
