# Monet demo & pitch script (S4-F)

Offline closed-loop path for design-track pitch and stage gates. **Stub pipeline only** — no AI keys, no network beyond `next dev`. Playwright is not required.

| Gate | Target |
|---|---|
| **S3** | Closed loop on ≥1 demo region (`hero-cta` + Contrast) |
| **S4** | Pitch path **&lt;20s to first apply** (PRD M3 / stages.mdc); full script **2–3 instructs + 1 undo in ~3 min** |

This doc keeps the S3-J smoke checklist and adds timed pitch spine + craft callouts for judges.

---

## Prerequisites

```bash
npm install
npm run dev
```

Open [http://localhost:3000/app](http://localhost:3000/app). Optional cold open: [http://localhost:3000/](http://localhost:3000/) (brand landing) → workspace CTA.

| Expect | Detail |
|---|---|
| Sample preview | `#monet-preview-root` shows the landing sample |
| Hero CTA | Button **Get started** (`data-monet-id="hero-cta"`) looks washed — low contrast (~1.62:1) |
| Stub AI | Instruct → `POST /api/pipeline` uses offline fixtures (no `AI_API_KEY`) |

Optional unit coverage (not a substitute for the UI dry-run):

```bash
npm test
```

---

## Timing — pitch spine to first apply (under 20s)

**Budgets below are targets, not measured stopwatch times.** Start the clock when the workspace preview is loaded and ready (Select mode available). Stop when the CTA visibly recolors after Proof-gated apply.

| Step | Action | Target budget |
|---|---|---|
| 1. Select | Toggle **Select** | 1s |
| 2. Lasso | Tool **Rect** (`R` if Tools rail focused); marquee over hero **Get started** | 4s |
| 3. Confirm | **Enter** or **Confirm** | 1s |
| 4. Scout | Facts appear (≥3 signals); note contrast fail | 3s |
| 5. Contrast chip | Click **Contrast** (prefill only — does not run) | 2s |
| 6. Instruct | **Instruct** or ⌘/Ctrl+Enter (`/` or `i` focuses instruct first) | 2s |
| 7. Apply | Stub rail completes; Proof ok → auto-apply on `hero-cta` | 5s |
| | **Sum to first apply** | **≈18s (&lt;20s gate)** |

**Fixture:** `hero-cta-contrast` (TRD §23 / `samples/landing/fixtures/`).

### Dry-run checkbox (human + stopwatch)

Fill during a live pass; do not invent numbers beforehand.

- [ ] Preview loaded; clock started: ______
- [ ] First apply visible: ______ → **elapsed = ______ s** (pass if &lt;20)
- [ ] Notes (missed lasso, slow scout, etc.): ______

---

## Pitch spine (judge path)

Use this as the verbal/visual spine. Call out craft while the loop runs (see [S4 craft notes](#s4-craft-notes-for-judges)).

1. **Select** — toggle workspace mode to **Select**.
2. **Lasso** — tool **Rect**; drag a marquee over the hero **Get started** button.
3. **Confirm** — **Enter** or click **Confirm** (Esc clears if you miss).
4. **Scout** — wait for facts (≥3 signals: colors / contrast / interactive count). Contrast should show a fail on the CTA.
5. **Instruct** — click chip **Contrast** (prefill only), then **Instruct** or ⌘/Ctrl+Enter.  
   Chip text: `Improve contrast so text and controls pass WCAG AA.`
6. **Pipeline** — Stage rail advances Scout → Brief → Craft → Brush → Proof (may complete nearly instantly in stub mode).
7. **Apply** — with `proof.ok`, suggestion auto-applies to `hero-cta` (darker label `#1a1f26` on lighter fill `#e8e0d4`).
8. **Outcome** — quiet summary, e.g. `CTA contrast 1.62→12.65 on hero-cta; AA pass.`
9. **Before / After** — toggle to show compare; leave on **After** for the rest of the pitch (or flip once for judges).

First apply ends here for the **&lt;20s** gate. Continue into the full pitch script for the remaining ~3 minutes.

---

## Full pitch (~3 min)

**Shape:** 2–3 instructs + 1 undo. Stay on stub fixtures. Aim for calm pacing after the fast spine.

| Clock (approx.) | Beat | What to do / say |
|---|---|---|
| 0:00–0:20 | Spine → first apply | Run [Timing](#timing--pitch-spine-to-first-apply-under-20s) / pitch spine on `hero-cta` + **Contrast**. Call out lasso ants → rail → apply morph. |
| 0:20–0:45 | Prove the loop | Brief Before/After; point at Outcome (1–2 lines, not a critique feed). |
| 0:45–1:45 | Second instruct | Re-lasso **`primary-nav`** + **Hierarchy** *or* **`signup-form`** + **Focus**. Confirm → chip → Instruct → apply. |
| 1:45–2:15 | Optional third | Other of nav/signup, or `hero-cta` + **Primary CTA** (distinct fixture). Skip if time is tight — 2 instructs is enough. |
| 2:15–2:45 | Undo | **Undo apply** (last apply). Say the edit is reversible / scoped. |
| 2:45–3:00 | Close | One line: situated instruct on a region → Proof-gated apply, offline stub, keyboard-usable chrome. |

### Second / third instruct quick map

| Region (`data-monet-id`) | Chip | Expect |
|---|---|---|
| `primary-nav` | Hierarchy | Quieter secondary emphasis / clearer primary |
| `signup-form` | Focus | Clearer focus / error affordances |
| `hero-cta` | Primary CTA | Distinct fixture from Contrast (`hero-cta-primary-cta`) |

### Full-pitch dry-run checkbox

- [ ] Instruct 1 (`hero-cta` Contrast) + first apply &lt;20s
- [ ] Instruct 2 (nav Hierarchy **or** signup Focus) applied
- [ ] Instruct 3 optional — done or skipped on purpose
- [ ] Undo once; washed/prior state restored for last apply
- [ ] Total wall time ≈ 3 min (comfortable, not rushed)

---

## S4 craft notes (for judges)

**Signature motions (call out 2–3):**

1. **Lasso** — marching-ants / ink stroke while drawing (Select + Rect or Freehand).
2. **Stage rail** — Scout → Brief → Craft → Brush → Proof advance on instruct (stub may be near-instant; still visible).
3. **Apply / undo morph** — CTA (or region) transitions on Proof-ok apply; Undo reverses with the same craft, not a hard snap.

**Keyboard (S4-D primary chrome):**

| Action | Key / control |
|---|---|
| Rect tool | **R** when focus is in the **Tools** rail |
| Freehand tool | **F** when focus is in the **Tools** rail |
| Focus instruct | **`/`** or **`i`** |
| Clear draft region | **Esc** |
| Confirm region | **Enter** or **Confirm** |
| Submit instruction | **Instruct** or ⌘/Ctrl+Enter |
| Mode | **Interact** / **Select** toggle |

**Reduced motion:** If a judge has OS **Reduce motion** on (`prefers-reduced-motion: reduce`), expect static dashed lasso (no marching ants), simplified rail/apply/undo motion — product still usable; call it out as intentional a11y, not a bug.

---

## Smoke checklist (offline green) — S3-J retained

Print or keep open while dry-running. Check each box only after you see the expected UI.

### Minimum path — `hero-cta` contrast

- [ ] `/app` loads sample at `#monet-preview-root` without external AI
- [ ] Select + Rect lasso over **Get started**; Confirm / Enter
- [ ] Scout facts appear; contrast fail visible for CTA
- [ ] Contrast chip prefills; submit does **not** auto-run from chip alone
- [ ] Pipeline completes; StageRail roles reach done (or instant stub complete)
- [ ] CTA recolors (Proof-gated apply) — readable ink on light fill
- [ ] Outcome summary 1–2 lines (not a critique feed)
- [ ] Before / After toggle works
- [ ] Undo apply restores original low-contrast CTA

**Pass:** all boxes checked → S3 closed-loop gate satisfied for the pitch spine.

### Optional follow-ups (same session or re-lasso)

Use the [quick map](#second--third-instruct-quick-map) above. Keep the live pitch to **2–3 instructs + 1 undo** in ~3 minutes.

---

## Keyboard cheat sheet

| Action | Key / control |
|---|---|
| Rect tool (Tools rail focused) | **R** |
| Freehand tool (Tools rail focused) | **F** |
| Focus instruct chrome | **`/`** or **`i`** |
| Clear draft region | **Esc** |
| Confirm region | **Enter** or **Confirm** |
| Submit instruction | **Instruct** or ⌘/Ctrl+Enter |
| Mode | **Interact** / **Select** toggle |
| Tool (pointer) | **Rect** / **Freehand** buttons |
| Undo last apply | **Undo apply** (when undo depth &gt; 0) |
| Before / After | Compare toggle in apply chrome |

---

## Failure triage

| Symptom | Check |
|---|---|
| Instruct disabled | Still in Select? Region confirmed? Scout facts present? |
| Wrong fixture / no visual change | Lasso include `hero-cta`? Contrast chip text submitted? |
| Apply skipped | Proof must be `ok`; see Outcome / rail for failed Proof |
| Pipeline error | Dev server running? Network tab → `POST /api/pipeline` 200 + stub body |
| Undo dead | Apply succeeded first? **Undo apply** enabled only when undo depth &gt; 0 |
| R/F no-op | Focus must be in the **Tools** rail; otherwise use tool buttons |
| `/` or `i` types in page | Focus was in an input; blur or use the shortcut from chrome/preview focus |

Fixture map and sample IDs: [samples/landing/fixtures/README.md](../samples/landing/fixtures/README.md).

---

## Automation note

Vitest covers pipeline stub match, apply/undo, and landing fixtures. **Playwright/Cypress is not wired** in `package.json` — do not add a heavy e2e harness for hackathon bandwidth. This document is the smoke + pitch source of truth (S3-J checklist + S4-F timing). When Playwright is added later, encode the minimum path section first.

---

## Gate check

| Item | When green |
|---|---|
| Offline stub path | No live model required |
| Lasso → instruct → pipeline → Proof apply → undo | Documented + manually green (smoke checklist) |
| ≥1 demo region | `hero-cta` contrast minimum |
| **S4 gate:** pitch path &lt;20s to first apply | Dry-run checkbox elapsed &lt;20s |
| Full pitch shape | 2–3 instructs + 1 undo in ~3 min |
| Craft callouts | Motions + keyboard + reduced-motion note rehearsed |
| Ready for S4 stage-close verify | Yes — run security / performance / completion verify after this subtask |

**S3 closed-loop** remains a prerequisite for the spine; **S4 advances** only after the &lt;20s dry-run and stage-close verify.
