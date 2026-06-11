"use client";

import * as React from "react";
import {
  Compass,
  Sparkles,
  AlertCircle,
  Loader2,
  Play,
  Square,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type {
  FileAnalysis,
  FileView,
  ImpactScoreSnapshot,
  RepoFile,
} from "@/lib/types";
import { buildFallbackAnalysis, getMockAnalysis } from "@/lib/mock-data";
import { computeImpactScore } from "@/lib/impact";
import {
  analyzeLocalFile,
  annotateLocalRiskByAnalysis,
  isFolderPickerSupported,
  pickLocalRepo,
  type LocalRepo,
} from "@/lib/local-repo";
import { FileSidebar } from "./FileSidebar";
import { CodePanel } from "./CodePanel";
import { InsightPanel } from "./InsightPanel";
import { FolderPicker } from "./FolderPicker";
import { cn } from "@/lib/utils";

export const DEMO_STEPS = [
  "Reading Jutro file",
  "Detecting Jutro / custom components",
  "Checking Git history",
  "Linking Jira tickets",
  "Finding Confluence docs",
  "Calculating impact",
  "Generating AI context",
] as const;

export type DemoStepIndex = number; // -1 = inactive
const DEMO_STEP_MS = 700;

const DEFAULT_FILE_NAME = "ClaimSummaryPage.tsx";

interface FilesResponse {
  files?: RepoFile[];
  error?: string;
}

interface FileResponse {
  path?: string;
  content?: string;
  error?: string;
}

interface AnalysisResponse {
  fileName?: string;
  path?: string;
  imports?: { source: string; names: string[] }[];
  jutroComponents?: string[];
  customComponents?: string[];
  localDependencies?: string[];
  externalDependencies?: string[];
  apiCalls?: string[];
  hooks?: string[];
  exportedComponents?: string[];
  usedBy?: string[];
  risk?: "low" | "medium" | "high";
  impactSummary?: string;
  error?: string;
}

export interface GitHistoryResponse {
  fileName: string;
  path: string;
  lastChangedBy: string | null;
  lastChangedDate: string | null;
  commits: {
    hash: string;
    author: string;
    date: string;
    message: string;
    ticketId: string | null;
  }[];
  ticketIds: string[];
  source: "real" | "mock";
  fallbackReason?: string;
  error?: string;
}

export interface JiraTicketDetail {
  id: string;
  title: string;
  status: "Open" | "In Progress" | "In Review" | "Done" | "Unknown";
  type: "Story" | "Bug" | "Task" | "Epic" | "Unknown";
  assignee: string;
  summary: string;
  source: "real" | "fallback";
}

export interface JiraTicketsResponse {
  tickets: JiraTicketDetail[];
  invalid: string[];
  error?: string;
}

export interface ConfluenceDocMatch {
  title: string;
  url: string;
  description: string;
  matchedKeywords: string[];
}

export interface ConfluenceDocsResponse {
  docs: ConfluenceDocMatch[];
  error?: string;
}

export interface AiContextSummaryResponse {
  source: "claude" | "fallback";
  summary: string;
  businessContext: string;
  technicalContext: string;
  changeHistorySummary: string;
  impactAnalysis: string;
  riskExplanation: string;
  recommendedNextSteps: string[];
  model?: string;
  fallbackReason?: string;
  error?: string;
}

export function AppShell() {
  const [files, setFiles] = React.useState<RepoFile[] | null>(null);
  const [filesError, setFilesError] = React.useState<string | null>(null);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);

  const [code, setCode] = React.useState<string | null>(null);
  const [codeLoading, setCodeLoading] = React.useState(false);
  const [codeError, setCodeError] = React.useState<string | null>(null);

  const [analysis, setAnalysis] = React.useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const [gitHistory, setGitHistory] = React.useState<GitHistoryResponse | null>(null);
  const [gitLoading, setGitLoading] = React.useState(false);
  const [gitError, setGitError] = React.useState<string | null>(null);

  const [jiraTickets, setJiraTickets] = React.useState<JiraTicketDetail[] | null>(null);
  const [jiraLoading, setJiraLoading] = React.useState(false);
  const [jiraError, setJiraError] = React.useState<string | null>(null);

  const [confluenceDocs, setConfluenceDocs] = React.useState<ConfluenceDocMatch[] | null>(null);
  const [confluenceLoading, setConfluenceLoading] = React.useState(false);
  const [confluenceError, setConfluenceError] = React.useState<string | null>(null);

  const [aiSummary, setAiSummary] = React.useState<AiContextSummaryResponse | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  // Repository source — "demo" runs through the server APIs; "local" runs
  // entirely in-browser against a folder picked via showDirectoryPicker.
  const [repoMode, setRepoMode] = React.useState<"demo" | "local">("demo");
  const [localRepo, setLocalRepo] = React.useState<LocalRepo | null>(null);
  const [localPickError, setLocalPickError] = React.useState<string | null>(null);
  const [localPickLoading, setLocalPickLoading] = React.useState(false);
  const [folderPickerSupported, setFolderPickerSupported] =
    React.useState<boolean>(true);
  React.useEffect(() => {
    setFolderPickerSupported(isFolderPickerSupported());
  }, []);

  const onPickLocalFolder = React.useCallback(async () => {
    setLocalPickError(null);
    setLocalPickLoading(true);
    try {
      const result = await pickLocalRepo();
      if (!result.ok) {
        setLocalPickError(result.error);
        return;
      }
      // Annotate risk per-file using the in-browser analyzer so the sidebar
      // doesn't show a sea of "medium" badges.
      const annotated = annotateLocalRiskByAnalysis(result.repo);
      const repo = { ...result.repo, files: annotated };
      setLocalRepo(repo);
      setRepoMode("local");
      setFiles(annotated);
      setFilesError(null);
      const initial =
        annotated.find((f) => f.name === DEFAULT_FILE_NAME) ?? annotated[0];
      // Force re-selection so all downstream effects refire.
      setSelectedPath(null);
      setTimeout(() => {
        if (initial) setSelectedPath(initial.path);
      }, 0);
    } finally {
      setLocalPickLoading(false);
    }
  }, []);

  const onResetToDemo = React.useCallback(() => {
    setRepoMode("demo");
    setLocalRepo(null);
    setLocalPickError(null);
    // Re-trigger the demo scan effect by clearing files so the initial scan
    // path runs again on the next render.
    setFiles(null);
    setFilesError(null);
    setSelectedPath(null);
  }, []);

  // Demo mode — runs the canonical "click → see context" path automatically.
  const [demoStep, setDemoStep] = React.useState<DemoStepIndex>(-1);
  const demoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoActive = demoStep >= 0;

  const stopDemo = React.useCallback(() => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setDemoStep(-1);
  }, []);

  const runDemo = React.useCallback(() => {
    if (!files || files.length === 0) return;
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    const target =
      files.find((f) => f.name === DEFAULT_FILE_NAME) ?? files[0];
    // Force a re-selection even if `target` is already selected, so every
    // downstream fetch (code, analyzer, git, jira, confluence, AI summary)
    // re-runs visibly during the demo. Without this, clicking Run demo on
    // the already-selected file would only animate the step strip — the
    // panels would sit there with stale content.
    setSelectedPath(null);
    // Re-set on the next tick so the selection effect's cleanup runs first.
    setTimeout(() => {
      setSelectedPath(target.path);
      setDemoStep(0);
    }, 0);
  }, [files]);

  React.useEffect(() => {
    if (demoStep < 0) return;
    if (demoStep >= DEMO_STEPS.length) {
      // Hold the "complete" state briefly, then auto-clear so the indicator
      // stays unobtrusive after the demo run.
      demoTimerRef.current = setTimeout(() => setDemoStep(-1), 1800);
      return;
    }
    demoTimerRef.current = setTimeout(
      () => setDemoStep((s) => s + 1),
      DEMO_STEP_MS
    );
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    };
  }, [demoStep]);

  React.useEffect(
    () => () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    },
    []
  );

  // Initial repository scan
  React.useEffect(() => {
    if (repoMode !== "demo") return;
    if (files !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/repository/files", { cache: "no-store" });
        const json = (await res.json()) as FilesResponse;
        if (cancelled) return;
        if (!res.ok || !json.files) {
          setFilesError(json.error ?? `Scan failed (HTTP ${res.status})`);
          return;
        }
        setFiles(json.files);
        const initial =
          json.files.find((f) => f.name === DEFAULT_FILE_NAME) ?? json.files[0];
        if (initial) setSelectedPath(initial.path);
      } catch (err) {
        if (cancelled) return;
        setFilesError(err instanceof Error ? err.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoMode, files]);

  // On selection: fetch source + analysis in parallel
  React.useEffect(() => {
    if (!selectedPath) return;
    let cancelled = false;

    setCode(null);
    setCodeError(null);
    setCodeLoading(true);

    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(true);

    setGitHistory(null);
    setGitError(null);
    setGitLoading(repoMode === "demo");

    setJiraTickets(null);
    setJiraError(null);
    setJiraLoading(false);

    setConfluenceDocs(null);
    setConfluenceError(null);
    setConfluenceLoading(false);

    setAiSummary(null);
    setAiError(null);
    setAiLoading(false);

    if (repoMode === "local") {
      // In local mode every step runs in-browser against the in-memory map.
      // No HTTP calls, no git history (the picked folder may not be a git
      // checkout), no Jira/Confluence — those settle to empty so the AI
      // summary effect runs with whatever context is available.
      const repo = localRepo;
      if (!repo) {
        setCodeError("Local repository is no longer available.");
        setCodeLoading(false);
        setAnalysisError("Local repository is no longer available.");
        setAnalysisLoading(false);
        return;
      }
      const source = repo.fileSources.get(selectedPath);
      if (typeof source !== "string") {
        setCodeError("File missing from the picked folder.");
        setCodeLoading(false);
        setAnalysisError("File missing from the picked folder.");
        setAnalysisLoading(false);
        return;
      }
      setCode(source);
      setCodeLoading(false);
      try {
        const result = analyzeLocalFile(repo, selectedPath);
        if (!result) {
          setAnalysisError("Unable to analyze the selected file.");
        } else {
          // Map to the same wire shape the API would have returned.
          setAnalysis({
            fileName: result.fileName,
            path: result.path,
            imports: result.imports,
            jutroComponents: result.jutroComponents,
            customComponents: result.customComponents,
            localDependencies: result.localDependencies,
            externalDependencies: result.externalDependencies,
            apiCalls: result.apiCalls,
            hooks: result.hooks,
            exportedComponents: result.exportedComponents,
            usedBy: result.usedBy,
            risk: result.risk,
            impactSummary: result.impactSummary,
          });
        }
      } catch (err) {
        setAnalysisError(
          err instanceof Error ? err.message : "Unable to analyze file"
        );
      } finally {
        setAnalysisLoading(false);
      }
      // Settle git/jira/confluence so the AI summary effect can run.
      setGitHistory(null);
      setGitLoading(false);
      setJiraTickets([]);
      setJiraLoading(false);
      setConfluenceDocs([]);
      setConfluenceLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const sourceReq = (async () => {
      try {
        const res = await fetch(
          `/api/repository/file?path=${encodeURIComponent(selectedPath)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as FileResponse;
        if (cancelled) return;
        if (!res.ok || typeof json.content !== "string") {
          setCodeError(json.error ?? `Read failed (HTTP ${res.status})`);
          return;
        }
        setCode(json.content);
      } catch (err) {
        if (cancelled) return;
        setCodeError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setCodeLoading(false);
      }
    })();

    const analysisReq = (async () => {
      try {
        const res = await fetch(
          `/api/analyze/file?path=${encodeURIComponent(selectedPath)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as AnalysisResponse;
        if (cancelled) return;
        if (!res.ok) {
          setAnalysisError(json.error ?? `Unable to analyze file (HTTP ${res.status})`);
          return;
        }
        setAnalysis(json);
      } catch (err) {
        if (cancelled) return;
        setAnalysisError(err instanceof Error ? err.message : "Unable to analyze file");
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();

    const gitReq = (async () => {
      try {
        const res = await fetch(
          `/api/git/history?path=${encodeURIComponent(selectedPath)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as GitHistoryResponse;
        if (cancelled) return;
        if (!res.ok) {
          setGitError(json.error ?? `Unable to load git history (HTTP ${res.status})`);
          return;
        }
        setGitHistory(json);
      } catch (err) {
        if (cancelled) return;
        setGitError(err instanceof Error ? err.message : "Unable to load git history");
      } finally {
        if (!cancelled) setGitLoading(false);
      }
    })();

    Promise.all([sourceReq, analysisReq, gitReq]);

    return () => {
      cancelled = true;
    };
  }, [selectedPath, repoMode, localRepo]);

  // After git history lands, look up Jira tickets for any extracted IDs.
  const ticketKey = (gitHistory?.ticketIds ?? []).join(",");
  React.useEffect(() => {
    if (!gitHistory) return;
    if (gitHistory.ticketIds.length === 0) {
      setJiraTickets([]);
      setJiraError(null);
      setJiraLoading(false);
      return;
    }
    let cancelled = false;
    setJiraTickets(null);
    setJiraError(null);
    setJiraLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/jira/tickets?ids=${encodeURIComponent(gitHistory.ticketIds.join(","))}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as JiraTicketsResponse;
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json.tickets)) {
          setJiraError(json.error ?? `Unable to load Jira tickets (HTTP ${res.status})`);
          return;
        }
        setJiraTickets(json.tickets);
      } catch (err) {
        if (cancelled) return;
        setJiraError(err instanceof Error ? err.message : "Unable to load Jira tickets");
      } finally {
        if (!cancelled) setJiraLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketKey, gitHistory]);

  const selectedFile = React.useMemo<RepoFile | null>(() => {
    if (!files || !selectedPath) return null;
    return files.find((f) => f.path === selectedPath) ?? null;
  }, [files, selectedPath]);

  // Collect Confluence search keywords from filename + analyzer components +
  // Jira ticket IDs. Triggered once analyzer + git/jira have produced data.
  const confluenceKeywords = React.useMemo(() => {
    if (!selectedFile) return [] as string[];
    const set = new Set<string>();
    const baseName = selectedFile.name.replace(/\.tsx?$/i, "");
    if (baseName) set.add(baseName);
    if (analysis && !analysisError) {
      for (const c of analysis.customComponents ?? []) set.add(c);
      for (const c of analysis.jutroComponents ?? []) set.add(c);
    }
    if (gitHistory) {
      for (const id of gitHistory.ticketIds) set.add(id);
    }
    return [...set];
  }, [selectedFile, analysis, analysisError, gitHistory]);

  const confluenceKey = confluenceKeywords.join("|");

  React.useEffect(() => {
    if (!selectedFile) return;
    // Wait until at least one upstream source has produced something to query
    // with — otherwise we'd run an empty search the moment a file is picked.
    const haveUpstream = !!analysis || !!gitHistory;
    if (!haveUpstream) return;

    if (confluenceKeywords.length === 0) {
      setConfluenceDocs([]);
      setConfluenceError(null);
      setConfluenceLoading(false);
      return;
    }

    let cancelled = false;
    setConfluenceDocs(null);
    setConfluenceError(null);
    setConfluenceLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/confluence/docs?keywords=${encodeURIComponent(confluenceKeywords.join(","))}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as ConfluenceDocsResponse;
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json.docs)) {
          setConfluenceError(
            json.error ?? `Unable to load documentation (HTTP ${res.status})`
          );
          return;
        }
        setConfluenceDocs(json.docs);
      } catch (err) {
        if (cancelled) return;
        setConfluenceError(
          err instanceof Error ? err.message : "Unable to load documentation"
        );
      } finally {
        if (!cancelled) setConfluenceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confluenceKey, selectedFile?.path, analysis, gitHistory]);

  // AI context summary — runs after all upstream sources have settled, so the
  // model gets the full assembled context (or a clear "missing" signal per
  // source). Re-runs on selection change because all upstream state was reset.
  const upstreamSettled =
    !!selectedFile &&
    code !== null &&
    (analysis !== null || analysisError !== null) &&
    (gitHistory !== null || gitError !== null) &&
    (jiraTickets !== null || jiraError !== null) &&
    (confluenceDocs !== null || confluenceError !== null);

  React.useEffect(() => {
    if (!upstreamSettled || !selectedFile) return;

    let cancelled = false;
    setAiSummary(null);
    setAiError(null);
    setAiLoading(true);

    const payload = {
      fileName: selectedFile.name,
      filePath: selectedFile.path,
      code: code ?? "",
      analysis: {
        jutroComponents: analysis?.jutroComponents ?? [],
        customComponents: analysis?.customComponents ?? [],
        localDependencies: analysis?.localDependencies ?? [],
        externalDependencies: analysis?.externalDependencies ?? [],
        apiCalls: analysis?.apiCalls ?? [],
        hooks: analysis?.hooks ?? [],
        exportedComponents: analysis?.exportedComponents ?? [],
        usedBy: analysis?.usedBy ?? [],
        impactSummary: analysis?.impactSummary ?? "",
      },
      gitHistory: gitHistory
        ? {
            source: gitHistory.source,
            lastChangedBy: gitHistory.lastChangedBy,
            lastChangedDate: gitHistory.lastChangedDate,
            commitCount: gitHistory.commits.length,
            ticketIds: gitHistory.ticketIds,
          }
        : null,
      jiraTickets: (jiraTickets ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        type: t.type,
        source: t.source,
      })),
      confluenceDocs: (confluenceDocs ?? []).map((d) => ({
        title: d.title,
        description: d.description,
        matchedKeywords: d.matchedKeywords,
      })),
      riskLevel: analysis?.risk ?? selectedFile.risk,
    };

    (async () => {
      try {
        const res = await fetch("/api/ai/context-summary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as AiContextSummaryResponse;
        if (cancelled) return;
        if (!res.ok || !json.summary) {
          setAiError(json.error ?? `Unable to generate AI summary (HTTP ${res.status})`);
          return;
        }
        setAiSummary(json);
      } catch (err) {
        if (cancelled) return;
        setAiError(err instanceof Error ? err.message : "Unable to generate AI summary");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    upstreamSettled,
    selectedFile?.path,
  ]);

  const view: FileView | null = React.useMemo(() => {
    if (!selectedFile) return null;

    const mock = getMockAnalysis(selectedFile.name);
    const baseDescription = mock?.description ?? "Analysis not available yet";
    const fallback = buildFallbackAnalysis();

    // Start from mock (or fallback) for narrative content (commits/tickets/docs).
    const merged: FileAnalysis = mock
      ? {
          description: mock.description,
          aiSummary: mock.aiSummary,
          jutroComponents: mock.jutroComponents,
          customComponents: mock.customComponents,
          commits: mock.commits,
          jiraTickets: mock.jiraTickets,
          confluenceDocs: mock.confluenceDocs,
          impactSummary: mock.impactSummary,
          dependencies: mock.dependencies,
          usedBy: mock.usedBy,
          apiCalls: [],
          hooks: [],
          exportedComponents: [],
          isFallback: false,
          isAnalyzed: false,
        }
      : { ...fallback, description: baseDescription };

    // Layer analyzer output on top — analyzer wins for code-derived fields.
    if (analysis && !analysisError) {
      merged.jutroComponents = analysis.jutroComponents ?? merged.jutroComponents;
      merged.customComponents = analysis.customComponents ?? merged.customComponents;
      merged.dependencies =
        analysis.localDependencies ?? merged.dependencies;
      merged.usedBy = analysis.usedBy ?? merged.usedBy;
      merged.apiCalls = analysis.apiCalls ?? [];
      merged.hooks = analysis.hooks ?? [];
      merged.exportedComponents = analysis.exportedComponents ?? [];
      merged.impactSummary = analysis.impactSummary ?? merged.impactSummary;
      merged.isAnalyzed = true;
    }

    // Risk precedence: engine score (when analyzer ran) > analyzer's own risk
    // > mock override > scanner default. The engine snapshot is computed below
    // and exposed separately, but its level wins for `file.risk`.
    const risk = analysis?.risk ?? mock?.risk ?? selectedFile.risk;

    return {
      ...selectedFile,
      risk,
      code: code ?? "",
      analysis: merged,
    };
  }, [selectedFile, code, analysis, analysisError]);

  // Engine-driven impact snapshot. Only when the analyzer has run successfully
  // do we have signals worth scoring; otherwise the panel shows the mock copy.
  const impactScore: ImpactScoreSnapshot | null = React.useMemo(() => {
    if (!view || !view.analysis.isAnalyzed) return null;
    return computeImpactScore({
      jutroComponents: view.analysis.jutroComponents,
      customComponents: view.analysis.customComponents,
      localDependencies: view.analysis.dependencies,
      apiCalls: view.analysis.apiCalls,
      usedBy: view.analysis.usedBy,
    });
  }, [view]);

  // When the engine produced a level, prefer it across the UI.
  const effectiveView: FileView | null = React.useMemo(() => {
    if (!view) return null;
    if (!impactScore) return view;
    return { ...view, risk: impactScore.riskLevel };
  }, [view, impactScore]);

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-bg-base">
      <TopBar
        files={files}
        repoMode={repoMode}
        demoActive={demoActive}
        canRunDemo={!!files && files.length > 0}
        onRunDemo={runDemo}
        onStopDemo={stopDemo}
      />
      <DemoBanner
        demoActive={demoActive}
        demoStep={demoStep}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_400px] gap-0">
        <FileSidebar
          files={files}
          loading={files === null && !filesError}
          error={filesError}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          repoMode={repoMode}
          repoName={repoMode === "local" ? localRepo?.rootName ?? "local folder" : "sample-jutro-repo"}
          folderPickerSupported={folderPickerSupported}
          folderPickerLoading={localPickLoading}
          folderPickerError={localPickError}
          onPickFolder={onPickLocalFolder}
          onResetToDemo={onResetToDemo}
        />
        {effectiveView ? (
          <CodePanel
            file={effectiveView}
            codeLoading={codeLoading}
            codeError={codeError}
          />
        ) : (
          <CenterPlaceholder
            loading={files === null && !filesError}
            error={filesError}
            empty={!!files && files.length === 0}
          />
        )}
        {effectiveView ? (
          <InsightPanel
            file={effectiveView}
            impactScore={impactScore}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
            gitHistory={gitHistory}
            gitLoading={gitLoading}
            gitError={gitError}
            jiraTickets={jiraTickets}
            jiraLoading={jiraLoading}
            jiraError={jiraError}
            confluenceDocs={confluenceDocs}
            confluenceLoading={confluenceLoading}
            confluenceError={confluenceError}
            aiSummary={aiSummary}
            aiLoading={aiLoading}
            aiError={aiError}
          />
        ) : (
          <RightPlaceholder
            loading={files === null && !filesError}
            error={filesError}
          />
        )}
      </div>
    </div>
  );
}

function TopBar({
  files,
  repoMode,
  demoActive,
  canRunDemo,
  onRunDemo,
  onStopDemo,
}: {
  files: RepoFile[] | null;
  repoMode: "demo" | "local";
  demoActive: boolean;
  canRunDemo: boolean;
  onRunDemo: () => void;
  onStopDemo: () => void;
}) {
  const count = files?.length ?? 0;
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
          <Compass size={16} strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">DevAtlas</div>
          <div className="text-[10px] uppercase tracking-wider text-fg-muted">
            Jutro Context Navigator
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-fg-muted">
          <Sparkles size={12} className="text-accent" />
          <span>
            {files === null
              ? repoMode === "local"
                ? "Scanning selected folder…"
                : "Indexing sample repository…"
              : `${count} TSX file${count === 1 ? "" : "s"} indexed · ${
                  repoMode === "local" ? "Local Folder" : "Demo Repo"
                }`}
          </span>
        </div>
        {demoActive ? (
          <button
            type="button"
            onClick={onStopDemo}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-strong bg-bg-subtle px-2.5 text-[11.5px] font-medium text-fg-primary hover:bg-bg-hover"
          >
            <Square size={11} className="fill-current" />
            Stop demo
          </button>
        ) : (
          <button
            type="button"
            onClick={onRunDemo}
            disabled={!canRunDemo}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2.5 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={11} className="fill-current" />
            Run demo
          </button>
        )}
      </div>
    </header>
  );
}

function DemoBanner({
  demoActive,
  demoStep,
}: {
  demoActive: boolean;
  demoStep: number;
}) {
  return (
    <div className="shrink-0 border-b border-border-subtle bg-gradient-to-r from-accent/10 via-bg-panel to-bg-panel">
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={12} className="shrink-0 text-accent" />
          <p className="truncate text-[12.5px] text-fg-secondary">
            <span className="font-semibold text-fg-primary">DevAtlas Demo:</span>{" "}
            From Jutro file to full engineering context in seconds.
          </p>
          <span
            className="ml-1 hidden shrink-0 cursor-help items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 lg:inline-flex"
            title="All repository, Git, Jira, and Confluence data shown here is sample data shipped with the demo. No real customer or production sources are wired in."
          >
            <ShieldCheck size={10} />
            Hackathon Safe Demo Data
          </span>
        </div>
        {demoActive ? (
          <DemoStepStrip currentStep={demoStep} />
        ) : (
          <span className="hidden shrink-0 text-[11px] text-fg-muted md:inline">
            Press <kbd className="rounded border border-border-strong bg-bg-subtle px-1 py-0.5 font-mono text-[10px]">Run demo</kbd> to walk through the experience.
          </span>
        )}
      </div>
    </div>
  );
}

function DemoStepStrip({ currentStep }: { currentStep: number }) {
  const total = DEMO_STEPS.length;
  const completed = currentStep >= total;
  const activeLabel = completed ? "Done" : DEMO_STEPS[currentStep] ?? "";
  return (
    <div className="flex shrink-0 items-center gap-2 text-[11px]">
      <div className="hidden items-center gap-1 lg:flex">
        {DEMO_STEPS.map((_, i) => {
          const state =
            i < currentStep
              ? "done"
              : i === currentStep
              ? "active"
              : "pending";
          return (
            <span
              key={i}
              className={cn(
                "h-1.5 w-6 rounded-full transition-colors duration-300",
                state === "done" && "bg-accent",
                state === "active" && "animate-pulse bg-accent/70",
                state === "pending" && "bg-border-strong"
              )}
              aria-hidden
            />
          );
        })}
      </div>
      <span className="inline-flex items-center gap-1.5 font-medium text-fg-primary">
        {completed ? (
          <Check size={12} className="text-emerald-300" />
        ) : (
          <Loader2 size={12} className="animate-spin text-accent" />
        )}
        <span className="tabular-nums text-fg-muted">
          {completed ? `${total}/${total}` : `${Math.min(currentStep + 1, total)}/${total}`}
        </span>
        <span>{activeLabel}</span>
      </span>
    </div>
  );
}

function CenterPlaceholder({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
}) {
  return (
    <main className="flex min-h-0 items-center justify-center bg-bg-base">
      <div className="flex flex-col items-center gap-2 text-center text-fg-muted">
        {error ? (
          <>
            <AlertCircle size={20} className="text-red-400" />
            <div className="text-sm font-medium text-fg-primary">
              Failed to scan repository
            </div>
            <div className="max-w-sm text-xs">{error}</div>
          </>
        ) : loading ? (
          <>
            <Loader2 size={18} className="animate-spin text-accent" />
            <div className="text-sm">Indexing the sample repository…</div>
          </>
        ) : empty ? (
          <div className="text-sm">No source files found in the sample repository.</div>
        ) : (
          <div className="text-sm">Select a file to inspect.</div>
        )}
      </div>
    </main>
  );
}

function RightPlaceholder({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-l border-border-subtle bg-bg-panel">
      <header className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[13px] font-semibold tracking-tight">
            Unified Engineering Context
          </span>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-xs text-fg-muted">
        {error
          ? "Context unavailable — repository scan failed."
          : loading
          ? "Waiting for repository scan…"
          : "Select a file to load its full context."}
      </div>
    </aside>
  );
}
