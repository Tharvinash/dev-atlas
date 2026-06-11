# DevAtlas — 5-Minute Hackathon Demo Script

**Audience:** Guidewire Malaysia hackathon judges
**Duration:** ~5 minutes
**Core message:** DevAtlas reduces context discovery time by unifying Jutro code, Git history, Jira tickets, Confluence docs, and AI impact analysis into one developer cockpit.

---

## 1. Opening — The Problem (≈45s)

> "Every Guidewire frontend engineer at this company has had the same morning.
>
> A Jira ticket lands. The title says: *update the claim payment display*. You open the codebase. You find a file called `ClaimSummaryPage.tsx`. And before you write a single line of code, you have to answer four questions:
>
> *What does this file do? Why does it exist? Who has changed it lately? And what will break if I touch it?*
>
> The answers are not in any one place. They are scattered across the codebase, Git history, Jira, Confluence, and inside the heads of senior engineers."

---

## 2. The Pain Points (≈45s)

> "We measured what this costs us.
>
> A typical investigation before changing an unfamiliar Jutro file takes about **45 minutes**. Engineers:
>
> - Search the code manually, file by file
> - Run `git log` and `git blame` to see who touched it
> - Open Jira to find the ticket behind the last change
> - Search Confluence for design notes — and often don't find them
> - Then they walk over to a senior engineer and ask
>
> Multiply this by every Jutro engineer, every day. Senior engineers become human search engines. New joiners stay slow for weeks. And worst of all — engineers ship changes *without* understanding the blast radius, because the cost of finding out is too high."

---

## 3. The DevAtlas Solution (≈30s)

> "DevAtlas is a single developer cockpit for the Guidewire Jutro frontend.
>
> You select a file. DevAtlas reads it, scans the rest of the repository, follows its real Git history, correlates Jira tickets and Confluence docs, calculates an impact score, and asks Claude to explain what's actually going on.
>
> What used to take 45 minutes — across five tools and one tap on the senior engineer's shoulder — now takes about 3 minutes, in one screen.
>
> Same context. **93% less time.**"

---

## 4. Live Demo Flow (≈2 min)

> "Let me show you. I'll click **Run demo** at the top." *(click)*

**Walk through the seven steps as the strip animates.**

### Step 1 — File selection
> "DevAtlas auto-selects `ClaimSummaryPage.tsx`, our canonical claim summary page. The center pane shows the actual source code, read live from disk."

### Step 2 — Static analysis
> "On the right, the static analyzer has already broken the file down. It identified four out-of-the-box Jutro components — `Page`, `Card`, `Grid`, `Button` — and two custom widgets, `ClaimStatusBanner` and `PaymentPanel`. It also walked the rest of the repository and found that `PaymentPanel` is used here, in this exact file."

### Step 3 — The Impact Graph
*(scroll to the impact graph in the center)*
> "This is the impact graph. On the left: everything this file depends on. In the middle: the file itself. On the right: everything that depends on *it*. Hover any node and DevAtlas highlights the connection. No more guessing what breaks."

### Step 4 — Git history
*(scroll back up the right panel)*
> "Real Git history is right here. We can see the file was last touched by *alex*, on `2026-05-15`, and DevAtlas extracted ticket IDs `CLAIM-1188` and `GW-9003` directly from the commit messages."

### Step 5 — Jira correlation
> "Those ticket IDs are resolved into full Jira context, automatically — title, status, type, assignee, summary. The engineer no longer leaves the screen."

### Step 6 — Confluence correlation
> "DevAtlas takes everything it knows — file name, components, ticket IDs — and uses it to find the right Confluence docs. *Claim Summary UX Flow* and *Claim Payment Panel Design Notes*. The matched keywords are surfaced so you can see *why* each doc was returned."

### Step 7 — Impact + Confidence + AI
> "The impact engine combines all these signals into a 0-100 risk score. This file scores **52 — medium**. DevAtlas tells you exactly why, and prescribes the change confidence: *Review downstream usages before modifying.*
>
> Finally, Claude — running on Claude Opus 4.8 — produces a developer-friendly summary, grounded *only* in the data we just gathered. No hallucinations. It even tells you what to do *next*: which consumers to check, which tickets to re-read, which docs to skim."

### The grand finale — Ask DevAtlas
*(click a suggested question, e.g. "What could break if I modify this?")*
> "And if the engineer still has a specific question — *Ask DevAtlas*. Claude reasons over the code, the Git history, the Jira tickets, the Confluence docs, *and* the impact analysis at once, and answers in plain English."

---

## 5. Business Impact (≈40s)

> "What does this mean for Guidewire?
>
> - **Investigation time: 45 min → 3 min — 93% saved.** That's hours back per engineer per week.
> - **Senior engineer interruptions go down.** Tribal knowledge becomes discoverable.
> - **Onboarding accelerates.** A new joiner can understand an unfamiliar Jutro file on day one, not week three.
> - **Change confidence goes up.** Fewer regressions because impact is explicit, not guessed at.
> - **And it's safe.** Today's demo runs entirely on sample data. The architecture is identical for production — point it at a real repo, real Jira, real Confluence, and the same UI works."

---

## 6. Future Roadmap (≈30s)

> "Today is a working hackathon prototype. The architecture supports a clear path forward:
>
> - **Real Jira and Confluence APIs** — the mock layer drops out, the UI is unchanged.
> - **Multi-repository support** — DevAtlas across the entire Jutro frontend ecosystem.
> - **Per-team risk thresholds** — calibrate change confidence to each team's release cadence.
> - **Claude streaming + tool use** — let Claude pull related files on its own, live, with citations.
> - **VS Code extension** — bring DevAtlas inline, without leaving the editor.
> - **Analytics** — measure investigation time saved, per team, over time."

---

## 7. Closing Statement (≈20s)

> "Today, engineers spend significant time being detectives. They navigate code, Git, Jira, Confluence, and one another, just to make a single safe change.
>
> DevAtlas turns that scavenger hunt into a single click.
>
> **Same context. 93% less time. Higher confidence. Faster onboarding.**
>
> That's DevAtlas. Thank you."

---

## Speaker notes & contingencies

| Situation | Move |
|---|---|
| Demo runs long | Skip Step 3 (impact graph) and Step 6 (Confluence). The story still lands with code → Git → Jira → AI. |
| Internet/Claude API hiccups | The fallback layer is built in. Both AI cards keep working — call it out: *"Even when Claude is down, DevAtlas degrades gracefully."* |
| Judge asks about hallucination | Mention that Claude is constrained to provided context only; the system prompt forbids invented tickets/commits/owners. The deterministic fallback grounds answers in the same data. |
| Judge asks about scaling | The static analyzer is regex-based and fast; the heaviest path is the per-file scan, which is `O(files × imports)`. Production would use cached AST indexes — same UI, same flow. |
| Judge asks why this matters | Senior engineer time is the single most expensive resource on a Jutro team. DevAtlas frees it. |

## Demo timing budget

| Section | Target |
|---|---|
| 1. Problem | 0:45 |
| 2. Pain | 0:45 |
| 3. Solution | 0:30 |
| 4. Live demo | 2:00 |
| 5. Business impact | 0:40 |
| 6. Roadmap | 0:30 |
| 7. Close | 0:20 |
| **Total** | **5:30** *(buffer for transitions)* |
