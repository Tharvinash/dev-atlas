import type { FileType, RepoFile, RiskLevel } from "./types";
import {
  analyzeFromMemory,
  type FileAnalysisResult,
  type RepoFileInput,
} from "./analyzer-core";

/**
 * Browser-only helpers that walk a `FileSystemDirectoryHandle` (returned by
 * `window.showDirectoryPicker()`), collect every `.tsx` file in scope, and
 * keep them in memory so the analyzer can run without leaving the page.
 *
 * Nothing here uploads or persists anything.
 */

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache",
]);

const ALLOWED_EXT = ".tsx";
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 1_000_000;

export interface LocalRepoFile extends RepoFile {
  /** Path inside the picked folder, posix-style. Used as the canonical path. */
  relativePath: string;
}

export interface LocalRepo {
  rootName: string;
  files: LocalRepoFile[];
  /** Repo-relative path → file source. Truncated entries are stored as-is. */
  fileSources: Map<string, string>;
}

export interface FolderPickResult {
  ok: true;
  repo: LocalRepo;
}

export interface FolderPickFailure {
  ok: false;
  error: string;
}

/**
 * Returns `true` when the browser exposes the File System Access API.
 * SSR-safe.
 */
export function isFolderPickerSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as {
    showDirectoryPicker?: () => Promise<unknown>;
  }).showDirectoryPicker === "function";
}

interface DirectoryPickerWindow {
  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
}

/**
 * Open the system folder picker, walk the returned tree, and return an
 * in-memory representation of every `.tsx` file inside it. Resolves with
 * `{ok:false, error}` on user-cancel, browser-not-supported, or
 * permission-denied.
 */
export async function pickLocalRepo(): Promise<
  FolderPickResult | FolderPickFailure
> {
  if (!isFolderPickerSupported()) {
    return {
      ok: false,
      error: "Folder selection is supported in Chrome/Edge for this demo.",
    };
  }
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await (window as unknown as DirectoryPickerWindow).showDirectoryPicker();
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") {
      return { ok: false, error: "Folder selection cancelled." };
    }
    if (e?.name === "SecurityError" || e?.name === "NotAllowedError") {
      return {
        ok: false,
        error: "Permission denied — please re-try and grant folder access.",
      };
    }
    return {
      ok: false,
      error: e?.message ?? "Unable to open folder picker.",
    };
  }

  try {
    const repo = await readDirectoryHandle(dir);
    return { ok: true, repo };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to read folder.",
    };
  }
}

async function readDirectoryHandle(
  root: FileSystemDirectoryHandle
): Promise<LocalRepo> {
  const files: LocalRepoFile[] = [];
  const fileSources = new Map<string, string>();

  await walk(root, "", files, fileSources);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { rootName: root.name, files, fileSources };
}

async function walk(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  files: LocalRepoFile[],
  sources: Map<string, string>
): Promise<void> {
  // FileSystemDirectoryHandle implements `entries()` as an async iterator.
  // Cast through `unknown` because TS lib types lag the spec.
  const iter = (
    dir as unknown as {
      entries(): AsyncIterableIterator<
        [string, FileSystemFileHandle | FileSystemDirectoryHandle]
      >;
    }
  ).entries();

  for await (const [name, handle] of iter) {
    if (files.length >= MAX_FILES) return;
    if (name.startsWith(".") && IGNORED_DIRS.has(name)) continue;
    const relPath = prefix ? `${prefix}/${name}` : name;

    if (handle.kind === "directory") {
      if (IGNORED_DIRS.has(name)) continue;
      await walk(handle as FileSystemDirectoryHandle, relPath, files, sources);
      continue;
    }

    if (!relPath.toLowerCase().endsWith(ALLOWED_EXT)) continue;

    const file = await (handle as FileSystemFileHandle).getFile();
    if (file.size > MAX_FILE_BYTES) continue;
    const source = await file.text();

    files.push({
      id: relPath,
      name,
      path: relPath,
      relativePath: relPath,
      type: classifyLocal(relPath),
      risk: "medium",
    });
    sources.set(relPath, source);
  }
}

function classifyLocal(relPath: string): FileType {
  const lower = relPath.toLowerCase();
  if (lower.includes("/pages/")) return "page";
  if (lower.includes("/components/")) return "component";
  if (lower.includes("/hooks/")) return "hook";
  return "other";
}

/**
 * Run the analyzer in-browser against the in-memory file set. Returns the
 * same shape as the server-side `/api/analyze/file` route.
 */
export function analyzeLocalFile(
  repo: LocalRepo,
  relPath: string
): FileAnalysisResult | null {
  const source = repo.fileSources.get(relPath);
  if (source === undefined) return null;
  const inputs: RepoFileInput[] = [];
  for (const f of repo.files) {
    const s = repo.fileSources.get(f.relativePath);
    if (s === undefined) continue;
    inputs.push({ path: f.relativePath, source: s });
  }
  return analyzeFromMemory(relPath, source, inputs);
}

/**
 * Build the same per-file risk signal the server scan provides for the demo
 * repo so the sidebar isn't a sea of "medium" badges. Cheap but useful: each
 * file gets analyzed once when the repo is loaded.
 */
export function annotateLocalRiskByAnalysis(repo: LocalRepo): LocalRepoFile[] {
  return repo.files.map((f) => {
    const result = analyzeLocalFile(repo, f.relativePath);
    if (!result) return f;
    return { ...f, risk: result.risk as RiskLevel };
  });
}
