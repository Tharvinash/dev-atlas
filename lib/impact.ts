import type { RiskLevel } from "./types";

export type ImpactNodeType =
  | "selected"
  | "dependency"
  | "usedBy"
  | "api"
  | "jutro"
  | "custom";

export interface ImpactNode {
  id: string;
  label: string;
  type: ImpactNodeType;
  risk?: RiskLevel;
}

export interface ImpactEdge {
  from: string;
  to: string;
  label: string;
}

export interface ImpactGraph {
  nodes: ImpactNode[];
  edges: ImpactEdge[];
}

export interface ImpactInputs {
  jutroComponents: string[];
  customComponents: string[];
  localDependencies: string[];
  apiCalls: string[];
  usedBy: string[];
}

export interface ImpactScore {
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
  changeConfidence: {
    headline: string;
    detail: string;
  };
}

const WEIGHTS = {
  usedBy: 20,
  apiCall: 15,
  custom: 8,
  dependency: 5,
};

export function computeImpactScore(inputs: ImpactInputs): ImpactScore {
  const counts = {
    dependencyCount: inputs.localDependencies.length,
    usedByCount: inputs.usedBy.length,
    apiCallCount: inputs.apiCalls.length,
    customComponentCount: inputs.customComponents.length,
    jutroComponentCount: inputs.jutroComponents.length,
  };

  const raw =
    counts.usedByCount * WEIGHTS.usedBy +
    counts.apiCallCount * WEIGHTS.apiCall +
    counts.customComponentCount * WEIGHTS.custom +
    counts.dependencyCount * WEIGHTS.dependency;

  const riskScore = Math.min(100, Math.max(0, raw));
  const riskLevel: RiskLevel =
    riskScore >= 66 ? "high" : riskScore >= 31 ? "medium" : "low";

  const explanation = buildExplanation(counts, riskLevel);
  const changeConfidence = buildChangeConfidence(riskLevel);

  return { riskScore, riskLevel, counts, explanation, changeConfidence };
}

function buildExplanation(
  counts: ImpactScore["counts"],
  riskLevel: RiskLevel
): string {
  const parts: string[] = [];
  if (counts.usedByCount > 0) {
    parts.push(
      `is reused by ${counts.usedByCount} file${counts.usedByCount === 1 ? "" : "s"}`
    );
  }
  if (counts.dependencyCount > 0) {
    parts.push(
      `imports ${counts.dependencyCount} local dependenc${counts.dependencyCount === 1 ? "y" : "ies"}`
    );
  }
  if (counts.apiCallCount > 0) {
    parts.push(
      `calls ${counts.apiCallCount} API-related function${counts.apiCallCount === 1 ? "" : "s"}`
    );
  }
  if (counts.customComponentCount > 0) {
    parts.push(
      `composes ${counts.customComponentCount} custom component${
        counts.customComponentCount === 1 ? "" : "s"
      }`
    );
  }

  const reason =
    parts.length === 0
      ? "has no detected dependencies, consumers, or API call sites"
      : parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];

  return `This file has ${riskLevel} impact because it ${reason}.`;
}

function buildChangeConfidence(riskLevel: RiskLevel): {
  headline: string;
  detail: string;
} {
  switch (riskLevel) {
    case "low":
      return {
        headline: "Safe to modify with normal validation",
        detail:
          "Run the existing test suite, sanity-check the rendered output, and ship.",
      };
    case "medium":
      return {
        headline: "Review downstream usages before modifying",
        detail:
          "Skim every consumer in the impact graph, confirm the prop contract still holds, and consider a regression test before merging.",
      };
    case "high":
      return {
        headline: "Requires senior review and regression testing",
        detail:
          "Coordinate with feature owners, walk the dependency graph end-to-end, and extend the test suite to cover the affected surfaces before merging.",
      };
  }
}

/* ------------------------------------------------------------------ */
/* Graph                                                              */
/* ------------------------------------------------------------------ */

const SELECTED_ID = "__selected__";

export function buildImpactGraph(
  selected: { name: string; path: string; risk: RiskLevel },
  inputs: ImpactInputs
): ImpactGraph {
  const nodes: ImpactNode[] = [
    {
      id: SELECTED_ID,
      label: selected.name,
      type: "selected",
      risk: selected.risk,
    },
  ];
  const edges: ImpactEdge[] = [];

  for (const dep of unique(inputs.localDependencies)) {
    const id = `dep:${dep}`;
    nodes.push({ id, label: dep, type: "dependency" });
    edges.push({ from: id, to: SELECTED_ID, label: "imports" });
  }
  for (const c of unique(inputs.customComponents)) {
    const id = `custom:${c}`;
    if (nodes.some((n) => n.id === id)) continue;
    nodes.push({ id, label: c, type: "custom" });
    edges.push({ from: id, to: SELECTED_ID, label: "uses" });
  }
  for (const j of unique(inputs.jutroComponents)) {
    const id = `jutro:${j}`;
    if (nodes.some((n) => n.id === id)) continue;
    nodes.push({ id, label: j, type: "jutro" });
    edges.push({ from: id, to: SELECTED_ID, label: "renders" });
  }
  for (const u of unique(inputs.usedBy)) {
    const id = `usedBy:${u}`;
    nodes.push({ id, label: u, type: "usedBy" });
    edges.push({ from: SELECTED_ID, to: id, label: "used by" });
  }
  for (const a of unique(inputs.apiCalls)) {
    const id = `api:${a}`;
    nodes.push({ id, label: a, type: "api" });
    edges.push({ from: SELECTED_ID, to: id, label: "calls" });
  }

  return { nodes, edges };
}

function unique<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export const IMPACT_SELECTED_ID = SELECTED_ID;
