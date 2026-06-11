# DevAtlas

> **AI-powered context navigator for Guidewire Jutro frontend codebases.**
> Pick a file, see what it does, who uses it, why it changed, and what breaks if you touch it — in one screen.

DevAtlas reduces the time engineers spend acting as detectives — searching code, Git, Jira, Confluence, and senior engineers — to understand a single file before changing it. It unifies all of those sources into a single developer cockpit, with Claude AI synthesizing the result into a developer-friendly brief.

**Investigation time: 45 min → 3 min — 93% saved.**

---

## Demo

```sh
npm install
npm run dev
# open http://localhost:3000
```

The default file (`ClaimSummaryPage.tsx`) is selected automatically. Click any other file in the left sidebar to see the right panel re-populate.

To enable real Claude-powered AI Engineering Briefs and Ask DevAtlas answers, copy `.env.example` to `.env.local` and add your `ANTHROPIC_API_KEY`. Without a key, every AI surface gracefully falls back to a deterministic, source-grounded summary so the demo always works.

---

## What it does

Selecting a Jutro file in the sidebar populates the right panel with:

| Card | What it shows | Source |
|---|---|---|
| **AI Engineering Brief** | Claude-synthesized summary, business + technical context, change history, impact analysis, risk explanation, recommended next steps. | Claude Opus 4.8 (or deterministic fallback) |
| **Why This Code Exists** | Plain-English narrative tying the latest commit, Jira ticket, and Confluence doc. | Deterministic, source-grounded |
| **Ask DevAtlas AI** | Free-form Q&A grounded in code + Git + Jira + Confluence. Five suggested prompts. | Claude API (or heuristic fallback) |
| **AI Recommendation** | Risk-tier-driven actionable bullets (low / medium / high). | Impact engine |
| **OOTB Jutro Components / Custom Components / Hooks / API Calls / Exports** | Static analysis of the file. | Regex-based AST analyzer |
| **Last Changed By / Recent Git History / Extracted Ticket IDs** | Real Git history when available, mock fallback otherwise. | `git log --follow` |
| **Linked Jira Tickets** | Resolved from commit-message ticket IDs. | Local mock dataset |
| **Knowledge Sources** | Confluence docs matched against assembled keywords. | Local mock dataset |
| **Change Impact + Risk Drivers** | 0–100 risk score with the four numeric drivers (consumers, API calls, custom components, dependencies). | Impact engine |
| **Developer Confidence** | "Safe to modify" / "Review downstream" / "Senior review required" guidance. | Risk-tier rules |
| **Change Impact Map** | Visual graph: Dependencies → Target File → Downstream Impact, with hover-to-trace edges. | Static analysis |
| **How DevAtlas Thinks** | Visual pipeline of the 6-stage AI reasoning flow. | Static |
| **Business Impact Metrics** | 45 min → 3 min savings, unified sources, reduces-list. | Static |

---

## Where AI is used

DevAtlas calls **Claude Opus 4.8** in two places, server-side, gated on `ANTHROPIC_API_KEY`:

1. **`POST /api/ai/context-summary`** — produces the AI Engineering Brief by synthesizing the assembled context (code + analyzer + Git + Jira + Confluence) into a single JSON object with seven structured fields. Adaptive thinking (`thinking: { type: "adaptive" }`) is enabled so Claude decides per-request how much to reason.
2. **`POST /api/ai/ask`** — answers free-form questions about the selected file using the same context payload, with a strict anti-hallucination contract: only the supplied data may be used; missing context must be acknowledged plainly.

Both routes have a deterministic fallback path that produces the same response shape from the analyzer + Git + Jira + Confluence data already in hand. Everything else (static analysis, Git history walk, Jira/Confluence mock correlation, impact graph, risk score) is deterministic — chosen so the demo is reliable on hackathon Wi-Fi.

API key handling: read from `process.env.ANTHROPIC_API_KEY` server-side only. Never exposed to the browser. Code sent to Claude is truncated to 8 KB regardless of what the client sends.

---

## Architecture

```
                                   ┌──────────────────────────────────────┐
                                   │  Right panel (Engineering Context)   │
                                   │  ┌────────────────────────────────┐  │
                                   │  │  AI Engineering Brief          │  │ ← /api/ai/context-summary
                                   │  │  Why This Code Exists          │  │
                                   │  │  Ask DevAtlas AI               │  │ ← /api/ai/ask
                                   │  │  AI Recommendation             │  │
                                   │  │  Static analysis cards         │  │
                                   │  │  Git / Jira / Confluence       │  │
                                   │  │  Change Impact + Confidence    │  │
                                   │  └────────────────────────────────┘  │
                                   └──────────────┬───────────────────────┘
                                                  │
                  ┌───────────────────────────────┼─────────────────────────────────┐
                  │                               │                                 │
                  ▼                               ▼                                 ▼
   ┌──────────────────────────┐   ┌────────────────────────────┐    ┌──────────────────────────┐
   │  Static analyzer         │   │  Git intelligence          │    │  Jira / Confluence       │
   │  lib/analyzer-core.ts    │   │  lib/git.ts                │    │  lib/mock-jira.ts        │
   │  (browser + Node)        │   │  execFile git log/blame    │    │  lib/mock-confluence.ts  │
   └──────────┬───────────────┘   └─────────────┬──────────────┘    └────────────┬─────────────┘
              │                                 │                                │
              ▼                                 ▼                                ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │              sample-jutro-repo/  (10 .tsx files, real local git history)        │
   │  src/pages/ClaimSummaryPage.tsx, ClaimDashboardPage.tsx, ClaimDetailPage.tsx,   │
   │  PaymentReviewPage.tsx, PolicyOverviewPage.tsx, BillingSearchPage.tsx           │
   │  src/components/ClaimStatusBanner.tsx, PaymentPanel.tsx,                        │
   │  ClaimActivityTimeline.tsx, ClaimReviewPanel.tsx                                │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

### Repository sources

- **Demo Repo** — bundled `sample-jutro-repo/`, scanned server-side via the `/api/repository/*` routes. Used by default.
- **Local Folder** — pick any folder on disk via the **Select Folder** button (Chromium browsers). The folder is walked client-side via the File System Access API, every `.tsx` is loaded into memory, and the same analyzer runs in the browser. **Nothing is uploaded.**

### API surface

All under `app/api/`:

| Route | Purpose |
|---|---|
| `GET /api/repository/files` | Scan `sample-jutro-repo/src` recursively, return `.tsx` files annotated with engine-computed risk. |
| `GET /api/repository/file?path=…` | Read one file, with traversal-safe path validation. |
| `GET /api/analyze/file?path=…` | Run the static analyzer: imports, Jutro/custom components, hooks, API call sites, exports, `usedBy`, risk. |
| `GET /api/git/history?path=…` | Walk local Git history with `git log --follow`. Mock fallback when no `.git/` is present. Extracts ticket IDs from commit messages. |
| `GET /api/jira/tickets?ids=…` | Resolve comma-separated ticket IDs against the mock Jira dataset. |
| `GET /api/confluence/docs?keywords=…` | Keyword-match Confluence docs (case-insensitive, ranked by overlap). |
| `POST /api/ai/context-summary` | Generate the AI Engineering Brief via Claude Opus 4.8 (or deterministic fallback). |
| `POST /api/ai/ask` | Answer a free-form question grounded in the assembled context (or deterministic fallback). |

---

## Tech stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn-style components**
- **Anthropic SDK** (`@anthropic-ai/sdk`) → **Claude Opus 4.8** with adaptive thinking
- **lucide-react** · `clsx` · `tailwind-merge`
- Static analyzer: regex-based, runs in both Node (server) and browser (folder picker)
- No backend service, no database, no auth, no cloud upload

---

## Project structure

```
app/                              Next.js App Router
├── api/                          API routes (see table above)
├── globals.css                   Tailwind base + custom tokens
├── layout.tsx                    Root layout (dark theme)
└── page.tsx                      Single route — renders <AppShell />

components/
├── AppShell.tsx                  Top-level orchestration: state, fetch chain, top bar
├── FileSidebar.tsx               File list + folder picker
├── FolderPicker.tsx              showDirectoryPicker UI
├── CodePanel.tsx                 Center panel (code preview + Change Impact Map)
├── ImpactGraph.tsx               Three-column Dependencies → Target → Downstream
├── InsightPanel.tsx              Right panel — every analysis card
├── AskDevAtlas.tsx               Free-form Q&A card
└── ui/                           Card / Button / Badge primitives

lib/
├── analyzer-core.ts              Pure browser/Node-portable analyzer
├── analyzer.ts                   Node wrapper (fs + path resolution)
├── repository.ts                 Demo-repo scanner + traversal-safe path resolver
├── local-repo.ts                 Browser folder picker + in-memory analyzer
├── git.ts                        execFile-based git log/blame, mock fallback
├── impact.ts                     Risk-score engine + impact graph builder
├── mock-data.ts                  Per-file narrative content (description, AI summary, commits, …)
├── mock-jira.ts                  15 fully-populated Jira tickets covering every commit ticket ID
├── mock-confluence.ts            4 docs with keyword search
├── ai-summary.ts                 Claude AI Engineering Brief + deterministic fallback
└── ai-qa.ts                      Claude Q&A + heuristic fallback

sample-jutro-repo/                Bundled sample Jutro codebase (10 .tsx files)
└── src/
    ├── pages/                    ClaimSummaryPage, ClaimDashboardPage, ClaimDetailPage,
    │                             PaymentReviewPage, PolicyOverviewPage, BillingSearchPage
    └── components/               ClaimStatusBanner, PaymentPanel, ClaimActivityTimeline,
                                  ClaimReviewPanel

docs/                             Hackathon docs (problem statement, demo script, …)
```

---

## Running locally

Requires Node.js 18+ (Node 20+ recommended).

```sh
# 1. Install
npm install

# 2. (Optional) Enable Claude
cp .env.example .env.local
# edit .env.local and paste ANTHROPIC_API_KEY=sk-ant-…

# 3. Run
npm run dev
# → http://localhost:3000
```

The sample repo ships pre-committed with real Git history, so the **Recent Git History** card shows real commits (`alex`, `cara`, `bri`, `dev`) referencing tickets `GW-9001`, `GW-9002`, `GW-9003`, `JUTRO-223`, `CLAIM-1188`, and `GW-1245` — all of which resolve to fully-populated mock Jira entries.

### Production build

```sh
npm run build && npm start
```

### Folder picker

The **Select Folder** button in the sidebar uses the File System Access API. It works in Chromium browsers (Chrome, Edge, Brave). On Firefox/Safari you get a friendly fallback message; the bundled demo repo continues to work.

---

## Demo script

A 5-minute speaking outline for hackathon judging is at [`docs/demo-script.md`](docs/demo-script.md).

---

## Hackathon scope

This is a hackathon prototype for the **Guidewire Malaysia AI Hackathon**. Scope is deliberately tight:

**In scope** — file-level analysis, static analyzer, Git correlation, Jira/Confluence correlation (mock), Claude AI synthesis, impact graph, risk score, free-form Q&A.

**Out of scope** — authentication, multi-user, RBAC, real-time collaboration, vector databases, multi-agent systems, CI/CD integration, GitHub/GitLab integration, full enterprise search, real Jira/Confluence APIs.

The mock layer is structured so each provider can be swapped for a real API without changing the UI. See [`docs/03-product-requirements.md`](docs/03-product-requirements.md) and [`docs/07-development-phases.md`](docs/07-development-phases.md) for the original phase plan.

---

## Hackathon-safe demo data

All repository, Git, Jira, and Confluence data shown in the app is sample data that ships with the repo. No real customer or production sources are wired in. The **Hackathon Safe Demo Data** badge in the top banner reaffirms this for judges.

---

## License

Built for the Guidewire Malaysia AI Hackathon. Internal use only.
