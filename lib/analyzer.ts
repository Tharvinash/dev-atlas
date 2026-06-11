import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveSafePath, scanRepository, REPO_ROOT } from "./repository";
import type { RiskLevel } from "./types";

export interface ImportSpec {
  /** Source string in the import statement, e.g. "@jutro/components". */
  source: string;
  /** Imported names. Default imports use the local default name. */
  names: string[];
}

export interface FileAnalysisResult {
  fileName: string;
  path: string;
  imports: ImportSpec[];
  jutroComponents: string[];
  customComponents: string[];
  localDependencies: string[];
  externalDependencies: string[];
  apiCalls: string[];
  hooks: string[];
  exportedComponents: string[];
  usedBy: string[];
  risk: RiskLevel;
  impactSummary: string;
}

export class AnalyzerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const KNOWN_JUTRO_TAGS = new Set([
  "Page",
  "Card",
  "Grid",
  "Button",
  "DataTable",
  "Modal",
  "Form",
  "Input",
  "Select",
  "Flex",
  "InlineNotification",
]);

const NATIVE_HTML_TAGS = new Set([
  "html","head","body","title","meta","link","script","style","base",
  "div","span","p","a","ul","ol","li","dl","dt","dd","header","footer","nav","main","section","article","aside","figure","figcaption","blockquote","hr","br",
  "h1","h2","h3","h4","h5","h6",
  "table","thead","tbody","tfoot","tr","th","td","caption","col","colgroup",
  "form","input","label","select","option","optgroup","textarea","button","fieldset","legend","datalist",
  "img","picture","source","video","audio","track","iframe","canvas","svg","path","g","circle","rect","line","polygon","polyline","ellipse","defs","mask","use","text","tspan",
  "code","pre","kbd","samp","var","mark","small","strong","em","b","i","u","s","sub","sup","time","abbr","cite","q","del","ins","ruby","rt","rp",
  "details","summary","dialog","menu","menuitem","template","slot",
  "address","bdi","bdo","data","wbr","output","progress","meter",
]);

const HOOK_NAMES = new Set([
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useContext",
  "useReducer",
  "useLayoutEffect",
  "useTransition",
  "useDeferredValue",
  "useId",
  "useImperativeHandle",
  "useSyncExternalStore",
  "useDebugValue",
]);

const JUTRO_PACKAGE_PATTERNS = [/^@jutro/i, /^jutro(?:[/-]|$)/i, /^@guidewire/i];

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\*\s+as\s+([\w$]+)|\{([^}]*)\})?\s*from\s+["']([^"']+)["']/g;

const SIDE_EFFECT_IMPORT_RE = /import\s+["']([^"']+)["']/g;

/**
 * Analyze a file under sample-jutro-repo. Path is validated; throws an
 * AnalyzerError with HTTP-style status on rejection.
 */
export async function analyzeFile(relPath: string): Promise<FileAnalysisResult> {
  const abs = resolveSafePath(relPath);
  if (!abs) throw new AnalyzerError("Path is outside the sample repository", 400);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isFile()) throw new AnalyzerError("File not found", 404);

  const source = await fs.readFile(abs, "utf8");
  return analyzeSource(relPath, source);
}

/* ------------------------------------------------------------------ */
/* Pure(ish) analysis from source string                              */
/* ------------------------------------------------------------------ */

async function analyzeSource(
  relPath: string,
  source: string
): Promise<FileAnalysisResult> {
  const stripped = stripCommentsAndStrings(source);
  const imports = parseImports(source);
  const jsxTags = extractJsxTags(stripped);
  const exportedComponents = extractExportedComponents(stripped);

  const jutroFromImports = jutroNamesFromImports(imports);
  const jutroFromTags = jsxTags.filter((t) => KNOWN_JUTRO_TAGS.has(t));
  const jutroComponents = uniqueSorted([...jutroFromImports, ...jutroFromTags]);

  const customComponents = uniqueSorted(
    jsxTags.filter(
      (t) =>
        !KNOWN_JUTRO_TAGS.has(t) &&
        !NATIVE_HTML_TAGS.has(t) &&
        !NATIVE_HTML_TAGS.has(t.toLowerCase()) &&
        !jutroFromImports.includes(t) &&
        /^[A-Z]/.test(t) &&
        !isFromJutroPackage(t, imports)
    )
  );

  const localDependencies = uniqueSorted(
    imports.filter((i) => isLocalImport(i.source)).map((i) => i.source)
  );
  const externalDependencies = uniqueSorted(
    imports.filter((i) => !isLocalImport(i.source)).map((i) => i.source)
  );

  const importedNames = new Set(imports.flatMap((i) => i.names));

  const apiCalls = uniqueSorted([
    ...detectApiCallSites(stripped),
    ...detectApiImports(imports),
    ...detectApiNamedFunctions(stripped),
  ]);

  const hooks = uniqueSorted(detectHooks(stripped, importedNames));
  const usedBy = await findUsedBy(relPath, exportedComponents);

  const risk = computeRisk({
    usedByCount: usedBy.length,
    apiCallCount: apiCalls.length,
    customComponentCount: customComponents.length,
  });

  const impactSummary = buildImpactSummary({
    fileName: path.basename(relPath),
    usedByCount: usedBy.length,
    apiCallCount: apiCalls.length,
    customComponentCount: customComponents.length,
  });

  return {
    fileName: path.basename(relPath),
    path: relPath,
    imports,
    jutroComponents,
    customComponents,
    localDependencies,
    externalDependencies,
    apiCalls,
    hooks,
    exportedComponents,
    usedBy,
    risk,
    impactSummary,
  };
}

/* ------------------------------------------------------------------ */
/* Source pre-processing                                              */
/* ------------------------------------------------------------------ */

/**
 * Replace comments and string/template literals with spaces (preserving
 * line/column positions) so downstream regex passes don't pick up code-shaped
 * patterns inside them.
 */
function stripCommentsAndStrings(source: string): string {
  const out = source.split("");
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === "/" && next === "/") {
      while (i < n && source[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }
    if (c === "/" && next === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out[i] = source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out[i] = " ";
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < n) {
          out[i] = " ";
          out[i + 1] = source[i + 1] === "\n" ? "\n" : " ";
          i += 2;
          continue;
        }
        out[i] = source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out[i] = " ";
        i++;
      }
      continue;
    }
    if (c === "`") {
      out[i] = " ";
      i++;
      while (i < n && source[i] !== "`") {
        if (source[i] === "\\" && i + 1 < n) {
          out[i] = " ";
          out[i + 1] = source[i + 1] === "\n" ? "\n" : " ";
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          // Keep ${...} contents as-is so identifiers still register for
          // hooks/API detection.
          out[i] = source[i];
          out[i + 1] = source[i + 1];
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            if (source[i] === "{") depth++;
            else if (source[i] === "}") depth--;
            out[i] = source[i];
            i++;
          }
          continue;
        }
        out[i] = source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out[i] = " ";
        i++;
      }
      continue;
    }

    i++;
  }
  return out.join("");
}

/* ------------------------------------------------------------------ */
/* Imports                                                            */
/* ------------------------------------------------------------------ */

function parseImports(source: string): ImportSpec[] {
  const found: ImportSpec[] = [];

  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(source)) !== null) {
    const [, defaultName, namespaceName, namedGroup, src] = m;
    const names: string[] = [];
    if (defaultName) names.push(defaultName);
    if (namespaceName) names.push(namespaceName);
    if (namedGroup) {
      for (const part of namedGroup.split(",")) {
        const cleaned = part.trim();
        if (!cleaned) continue;
        const noType = cleaned.replace(/^type\s+/, "");
        const aliasMatch = noType.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        names.push(aliasMatch ? aliasMatch[2] : noType);
      }
    }
    found.push({ source: src, names });
  }

  SIDE_EFFECT_IMPORT_RE.lastIndex = 0;
  while ((m = SIDE_EFFECT_IMPORT_RE.exec(source)) !== null) {
    const src = m[1];
    if (!found.some((f) => f.source === src)) {
      found.push({ source: src, names: [] });
    }
  }

  return found;
}

function jutroNamesFromImports(imports: ImportSpec[]): string[] {
  const out: string[] = [];
  for (const imp of imports) {
    if (JUTRO_PACKAGE_PATTERNS.some((re) => re.test(imp.source))) {
      out.push(...imp.names);
    }
  }
  return out;
}

function isFromJutroPackage(name: string, imports: ImportSpec[]): boolean {
  return imports.some(
    (imp) =>
      JUTRO_PACKAGE_PATTERNS.some((re) => re.test(imp.source)) &&
      imp.names.includes(name)
  );
}

function isLocalImport(source: string): boolean {
  if (source.startsWith(".")) return true;
  if (source.startsWith("@/components")) return true;
  if (source.startsWith("@/pages")) return true;
  if (source.startsWith("@/hooks")) return true;
  if (source.startsWith("@/api")) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* JSX tags / hooks / API / exports                                   */
/* ------------------------------------------------------------------ */

function extractJsxTags(stripped: string): string[] {
  const tags = new Set<string>();
  const re = /<\s*([A-Za-z][A-Za-z0-9_.]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const head = m[1].split(".")[0];
    tags.add(head);
  }
  return [...tags];
}

function detectHooks(stripped: string, importedNames: Set<string>): string[] {
  const found = new Set<string>();
  const re = /\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1];
    if (HOOK_NAMES.has(name) || importedNames.has(name) || /^use[A-Z]/.test(name)) {
      found.add(name);
    }
  }
  return [...found];
}

function detectApiCallSites(stripped: string): string[] {
  const out: string[] = [];
  if (/\bfetch\s*\(/.test(stripped)) out.push("fetch()");
  for (const verb of ["get", "post", "put", "delete", "patch"] as const) {
    const re = new RegExp(`\\baxios\\s*\\.\\s*${verb}\\s*\\(`);
    if (re.test(stripped)) out.push(`axios.${verb}()`);
  }
  if (/\baxios\s*\(/.test(stripped)) out.push("axios()");
  return out;
}

function detectApiImports(imports: ImportSpec[]): string[] {
  return imports
    .filter((i) => /\/api(?:\/|$)/i.test(i.source) || /^@\/api/i.test(i.source))
    .map((i) => `import ${i.source}`);
}

function detectApiNamedFunctions(stripped: string): string[] {
  const out = new Set<string>();
  // Identifier containing the substring "api" (case-insensitive), declared as
  // a function or assigned via const/let/var.
  const re = /\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*[Aa][Pp][Ii][\w$]*)\s*[=(]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    out.add(`${m[1]}()`);
  }
  return [...out];
}

function extractExportedComponents(stripped: string): string[] {
  const out = new Set<string>();
  for (const m of stripped.matchAll(/export\s+default\s+function\s+([A-Z][\w$]*)/g)) {
    out.add(m[1]);
  }
  for (const m of stripped.matchAll(/export\s+(?:async\s+)?function\s+([A-Z][\w$]*)/g)) {
    out.add(m[1]);
  }
  for (const m of stripped.matchAll(/export\s+(?:const|let|var)\s+([A-Z][\w$]*)/g)) {
    out.add(m[1]);
  }
  for (const m of stripped.matchAll(/(?<!export\s)\bfunction\s+([A-Z][\w$]*)/g)) {
    out.add(m[1]);
  }
  return [...out];
}

/* ------------------------------------------------------------------ */
/* usedBy scan                                                        */
/* ------------------------------------------------------------------ */

async function findUsedBy(
  relPath: string,
  exportedComponents: string[]
): Promise<string[]> {
  const all = await scanRepository();
  const targetBase = path.basename(relPath, path.extname(relPath));
  const targetAbs = path.resolve(REPO_ROOT, relPath);
  const matches: string[] = [];

  for (const file of all) {
    if (file.path === relPath) continue;
    const candidateAbs = path.resolve(REPO_ROOT, file.path);
    let content: string;
    try {
      content = await fs.readFile(candidateAbs, "utf8");
    } catch {
      continue;
    }

    if (referencesFile(content, candidateAbs, targetAbs, targetBase, exportedComponents)) {
      matches.push(file.path);
    }
  }
  return matches.sort();
}

function referencesFile(
  content: string,
  candidateAbs: string,
  targetAbs: string,
  targetBase: string,
  exportedComponents: string[]
): boolean {
  const candidateDir = path.dirname(candidateAbs);
  const sources: string[] = [];

  IMPORT_RE.lastIndex = 0;
  SIDE_EFFECT_IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(content)) !== null) sources.push(m[4]);
  while ((m = SIDE_EFFECT_IMPORT_RE.exec(content)) !== null) sources.push(m[1]);

  for (const src of sources) {
    if (src.startsWith(".")) {
      const resolved = path.resolve(candidateDir, src);
      if (matchesTarget(resolved, targetAbs)) return true;
    } else if (src.startsWith("@/")) {
      const resolved = path.resolve(REPO_ROOT, "src", src.slice(2));
      if (matchesTarget(resolved, targetAbs)) return true;
    } else if (src.endsWith(`/${targetBase}`)) {
      // Bare-package shape `…/Foo` that conventionally maps to a local file
      // sharing the basename. Cheap heuristic for sample repos.
      return true;
    }
  }

  for (const name of exportedComponents) {
    const re = new RegExp(`<\\s*${escapeRegex(name)}\\b|\\b${escapeRegex(name)}\\s*\\(`);
    if (re.test(content)) return true;
  }

  return false;
}

function matchesTarget(resolvedAbs: string, targetAbs: string): boolean {
  const resolved = stripExt(resolvedAbs);
  const target = stripExt(targetAbs);
  if (resolved === target) return true;
  if (path.basename(targetAbs).startsWith("index.") && path.dirname(targetAbs) === resolved) {
    return true;
  }
  return false;
}

function stripExt(p: string): string {
  const ext = path.extname(p);
  return ext ? p.slice(0, -ext.length) : p;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/* Risk + impact                                                      */
/* ------------------------------------------------------------------ */

function computeRisk(args: {
  usedByCount: number;
  apiCallCount: number;
  customComponentCount: number;
}): RiskLevel {
  if (args.usedByCount >= 3 || args.apiCallCount >= 2) return "high";
  if (args.usedByCount >= 1 || args.customComponentCount >= 2) return "medium";
  return "low";
}

function buildImpactSummary(args: {
  fileName: string;
  usedByCount: number;
  apiCallCount: number;
  customComponentCount: number;
}): string {
  const parts: string[] = [];
  parts.push(
    args.usedByCount === 0
      ? `${args.fileName} has no detected consumers in this repository.`
      : `${args.fileName} is referenced by ${args.usedByCount} other file${
          args.usedByCount === 1 ? "" : "s"
        }.`
  );
  parts.push(
    args.apiCallCount === 0
      ? "No API call sites were detected — this file is presentational."
      : `It performs ${args.apiCallCount} API call site${
          args.apiCallCount === 1 ? "" : "s"
        }, so changes may affect data flow.`
  );
  parts.push(
    args.customComponentCount === 0
      ? "It composes Jutro primitives only."
      : `It composes ${args.customComponentCount} custom component${
          args.customComponentCount === 1 ? "" : "s"
        } and shares their behaviour.`
  );

  let area: string;
  if (args.usedByCount >= 3 || args.apiCallCount >= 2) {
    area =
      "Likely impact area: cross-cutting — coordinate with feature owners before structural changes.";
  } else if (args.usedByCount >= 1 || args.customComponentCount >= 2) {
    area = "Likely impact area: scoped to its consumers and embedded widgets.";
  } else {
    area = "Likely impact area: localized — visual or leaf-level changes only.";
  }
  parts.push(area);
  return parts.join(" ");
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items)].sort();
}
