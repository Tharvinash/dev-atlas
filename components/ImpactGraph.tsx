"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Boxes,
  Component as ComponentIcon,
  FileCode2,
  Package,
  Plug,
  Radar,
} from "lucide-react";
import type { FileView } from "@/lib/types";
import {
  buildImpactGraph,
  type ImpactNode,
  type ImpactNodeType,
  IMPACT_SELECTED_ID,
} from "@/lib/impact";
import { cn } from "@/lib/utils";

interface ImpactGraphProps {
  file: FileView;
}

interface ColumnSpec {
  key: "deps" | "selected" | "consumers";
  title: string;
  groups: GroupSpec[];
}

interface GroupSpec {
  type: ImpactNodeType;
  label: string;
  icon: React.ReactNode;
}

const LEFT_GROUPS: GroupSpec[] = [
  { type: "dependency", label: "Local deps", icon: <Package size={10} /> },
  { type: "custom", label: "Custom components", icon: <ComponentIcon size={10} /> },
  { type: "jutro", label: "Jutro OOTB", icon: <Boxes size={10} /> },
];

const RIGHT_GROUPS: GroupSpec[] = [
  { type: "usedBy", label: "Used by", icon: <Radar size={10} /> },
  { type: "api", label: "API calls", icon: <Plug size={10} /> },
];

export function ImpactGraph({ file }: ImpactGraphProps) {
  const a = file.analysis;
  const graph = React.useMemo(
    () =>
      buildImpactGraph(
        { name: file.name, path: file.path, risk: file.risk },
        {
          jutroComponents: a.jutroComponents,
          customComponents: a.customComponents,
          localDependencies: a.dependencies,
          apiCalls: a.apiCalls,
          usedBy: a.usedBy,
        }
      ),
    [file.name, file.path, file.risk, a]
  );

  const [hoverNodeId, setHoverNodeId] = React.useState<string | null>(null);

  const leftNodes = (type: ImpactNodeType) =>
    graph.nodes.filter((n) => n.type === type);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const nodeRefs = React.useRef(new Map<string, HTMLElement>());

  const setNodeRef = React.useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) nodeRefs.current.set(id, el);
      else nodeRefs.current.delete(id);
    },
    []
  );

  const [paths, setPaths] = React.useState<EdgePath[]>([]);

  const recomputePaths = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerBox = container.getBoundingClientRect();
    const next: EdgePath[] = [];
    for (const edge of graph.edges) {
      const fromEl = nodeRefs.current.get(edge.from);
      const toEl = nodeRefs.current.get(edge.to);
      if (!fromEl || !toEl) continue;
      const fromBox = fromEl.getBoundingClientRect();
      const toBox = toEl.getBoundingClientRect();
      const fromRight = fromBox.right - containerBox.left;
      const fromMidY = fromBox.top + fromBox.height / 2 - containerBox.top;
      const toLeft = toBox.left - containerBox.left;
      const toMidY = toBox.top + toBox.height / 2 - containerBox.top;
      next.push({
        id: `${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        d: cubicPath(fromRight, fromMidY, toLeft, toMidY),
      });
    }
    setPaths(next);
  }, [graph.edges]);

  // Recompute on size changes (window resize, parent layout shifts).
  React.useLayoutEffect(() => {
    recomputePaths();
  }, [recomputePaths, graph]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputePaths());
    ro.observe(container);
    for (const el of nodeRefs.current.values()) ro.observe(el);
    window.addEventListener("resize", recomputePaths);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recomputePaths);
    };
  }, [recomputePaths]);

  const isEdgeHovered = (path: EdgePath) =>
    hoverNodeId !== null &&
    (path.from === hoverNodeId || path.to === hoverNodeId);

  const isNodeDimmed = (id: string) =>
    hoverNodeId !== null && hoverNodeId !== id && !connected(graph.edges, hoverNodeId, id);

  return (
    <div ref={containerRef} className="relative">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <marker
            id="impact-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(170, 180, 200, 0.55)" />
          </marker>
          <marker
            id="impact-arrow-strong"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(91, 141, 239)" />
          </marker>
        </defs>
        {paths.map((p) => {
          const hovered = isEdgeHovered(p);
          return (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={hovered ? "rgb(91, 141, 239)" : "rgba(140, 150, 170, 0.35)"}
              strokeWidth={hovered ? 1.6 : 1}
              strokeLinecap="round"
              markerEnd={hovered ? "url(#impact-arrow-strong)" : "url(#impact-arrow)"}
              style={{ transition: "stroke 120ms, stroke-width 120ms" }}
            />
          );
        })}
      </svg>

      <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(180px,220px)_minmax(0,1fr)] items-start gap-6">
        <div className="flex flex-col gap-3">
          <ColumnHeader title="Dependencies" />
          {LEFT_GROUPS.map((g) => {
            const items = leftNodes(g.type);
            if (items.length === 0) return null;
            return (
              <NodeGroup
                key={g.type}
                spec={g}
                nodes={items}
                setNodeRef={setNodeRef}
                hoverNodeId={hoverNodeId}
                onHoverChange={setHoverNodeId}
                isDimmed={isNodeDimmed}
              />
            );
          })}
          {LEFT_GROUPS.every((g) => leftNodes(g.type).length === 0) ? (
            <EmptyColumn>No inputs detected.</EmptyColumn>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <ColumnHeader title="Target File" align="center" />
          <SelectedNode
            file={file}
            setNodeRef={setNodeRef(IMPACT_SELECTED_ID)}
            isDimmed={isNodeDimmed(IMPACT_SELECTED_ID)}
            onHoverChange={setHoverNodeId}
          />
        </div>

        <div className="flex flex-col gap-3">
          <ColumnHeader title="Downstream Impact" />
          {RIGHT_GROUPS.map((g) => {
            const items = leftNodes(g.type);
            if (items.length === 0) return null;
            return (
              <NodeGroup
                key={g.type}
                spec={g}
                nodes={items}
                setNodeRef={setNodeRef}
                hoverNodeId={hoverNodeId}
                onHoverChange={setHoverNodeId}
                isDimmed={isNodeDimmed}
              />
            );
          })}
          {RIGHT_GROUPS.every((g) => leftNodes(g.type).length === 0) ? (
            <EmptyColumn>No detected consumers or API calls.</EmptyColumn>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-fg-muted">
        <ArrowLeftRight size={10} />
        <span>flow:</span>
        <Legend type="dependency" label="local deps" />
        <Legend type="custom" label="custom" />
        <Legend type="jutro" label="Jutro" />
        <Legend type="selected" label="selected" />
        <Legend type="usedBy" label="used by" />
        <Legend type="api" label="API" />
      </div>
    </div>
  );
}

interface EdgePath {
  id: string;
  from: string;
  to: string;
  d: string;
}

function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(40, (x2 - x1) * 0.6);
  const c1x = x1 + dx;
  const c2x = x2 - dx;
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

function connected(edges: { from: string; to: string }[], a: string, b: string): boolean {
  return edges.some(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)
  );
}

function ColumnHeader({
  title,
  align = "left",
}: {
  title: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider text-fg-muted",
        align === "center" ? "text-center" : ""
      )}
    >
      {title}
    </div>
  );
}

function EmptyColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-center text-[11px] italic text-fg-muted">
      {children}
    </div>
  );
}

function NodeGroup({
  spec,
  nodes,
  setNodeRef,
  hoverNodeId,
  onHoverChange,
  isDimmed,
}: {
  spec: GroupSpec;
  nodes: ImpactNode[];
  setNodeRef: (id: string) => (el: HTMLElement | null) => void;
  hoverNodeId: string | null;
  onHoverChange: (id: string | null) => void;
  isDimmed: (id: string) => boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
        {spec.icon}
        <span>{spec.label}</span>
        <span className="ml-auto text-fg-muted/70">{nodes.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {nodes.map((n) => (
          <NodeBox
            key={n.id}
            node={n}
            ref={setNodeRef(n.id)}
            dimmed={isDimmed(n.id)}
            highlighted={hoverNodeId === n.id}
            onHoverChange={onHoverChange}
          />
        ))}
      </div>
    </div>
  );
}

const NODE_CLASSES: Record<ImpactNodeType, string> = {
  selected:
    "border-accent/50 bg-accent/15 text-fg-primary shadow-[0_0_0_1px_rgba(91,141,239,0.15),0_0_24px_-6px_rgba(91,141,239,0.5)]",
  dependency: "border-zinc-500/40 bg-zinc-500/10 text-zinc-200",
  custom: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  jutro: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  usedBy: "border-red-500/40 bg-red-500/10 text-red-200",
  api: "border-orange-500/40 bg-orange-500/10 text-orange-200",
};

const NodeBox = React.forwardRef<
  HTMLDivElement,
  {
    node: ImpactNode;
    dimmed: boolean;
    highlighted: boolean;
    onHoverChange: (id: string | null) => void;
  }
>(function NodeBox({ node, dimmed, highlighted, onHoverChange }, ref) {
  return (
    <div
      ref={ref}
      onMouseEnter={() => onHoverChange(node.id)}
      onMouseLeave={() => onHoverChange(null)}
      className={cn(
        "truncate rounded-md border px-2.5 py-1.5 font-mono text-[11.5px] transition-all duration-150 cursor-default",
        NODE_CLASSES[node.type],
        dimmed && "opacity-30",
        highlighted && "ring-2 ring-accent/40 ring-offset-1 ring-offset-bg-base"
      )}
      title={node.label}
    >
      {node.label}
    </div>
  );
});

function SelectedNode({
  file,
  setNodeRef,
  isDimmed,
  onHoverChange,
}: {
  file: FileView;
  setNodeRef: (el: HTMLElement | null) => void;
  isDimmed: boolean;
  onHoverChange: (id: string | null) => void;
}) {
  const dir = file.path.split("/").slice(0, -1).join("/");
  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => onHoverChange(IMPACT_SELECTED_ID)}
      onMouseLeave={() => onHoverChange(null)}
      className={cn(
        "flex flex-col gap-1 rounded-lg border-2 border-accent/60 bg-gradient-to-br from-accent/20 to-accent/5 px-3 py-3 shadow-[0_0_0_1px_rgba(91,141,239,0.2),0_0_32px_-6px_rgba(91,141,239,0.6)] transition-opacity",
        isDimmed && "opacity-30"
      )}
    >
      <div className="flex items-center gap-1.5">
        <FileCode2 size={12} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-accent/80">
          Target File
        </span>
      </div>
      <div className="font-mono text-[13px] font-semibold leading-tight text-fg-primary">
        {file.name}
      </div>
      {dir ? (
        <div className="truncate font-mono text-[10.5px] text-fg-muted" title={dir}>
          {dir}
        </div>
      ) : null}
      <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
        <span className="text-fg-muted">risk</span>
        <span className={cn("font-semibold", riskTextClass(file.risk))}>
          {file.risk}
        </span>
      </div>
    </div>
  );
}

function riskTextClass(risk: FileView["risk"]): string {
  return risk === "high"
    ? "text-red-300"
    : risk === "medium"
    ? "text-yellow-300"
    : "text-emerald-300";
}

function Legend({ type, label }: { type: ImpactNodeType; label: string }) {
  const swatch = NODE_CLASSES[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]",
        swatch
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
