# Monet — Technical Requirements Document (TRD)

| Field | Value |
|---|---|
| **Product** | Monet |
| **Companions** | [PRD.md](./PRD.md) · [FUTURE.md](./FUTURE.md) |
| **Document status** | v2.0 — Solo builder · agentic edit pipeline |
| **Last updated** | 2026-08-11 |
| **Builder model** | Solo |

---

## 1. Purpose

This TRD defines the technical architecture, stack, data models, APIs, and implementation constraints for Monet, optimized for a **solo builder**.

It separates:

- **MVP (hackathon)** — local-first, single-player edit, demo-reliable agentic pipeline  
- **Future** — email/password + OAuth, then cloud save, share links, realtime rooms — sequenced in [FUTURE.md](./FUTURE.md)

MVP must not implement full auth/multiplayer, but **must** use IDs, event shapes, and module boundaries so a solo builder can integrate those systems later without a rewrite.

### 1.1 Solo engineering rules

| Rule | Practice |
|---|---|
| Opinionated defaults | Prefer one clear choice over option matrices |
| Vertical slices | Finish selection polish before adding vendors |
| Ports over platforms | `AuthPort` / `RealtimePort` in MVP; Supabase in F0+ |
| Cut tests, not demo path | One Playwright smoke > broad coverage during hackathon |
| No premature multiplayer | Reducer-ready ≠ websocket now |
| Pipeline over monolith | Role modules + orchestrator; stub can short-circuit |

---

## 2. System overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Next.js)                        │
│  Marketing · Workspace shell · Preview host · Overlay tools     │
│  Scout (region) · Instruct UI · Stage rail · Apply engine       │
└───────────────┬─────────────────────────┬───────────────────────┘
                │ REST / RPC (MVP local)  │ Future: WS / realtime
                ▼                         ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│     App API (Next)       │   │ Realtime gateway (future)        │
│  pipeline · sessions     │   │ editTurns · presence · selection │
└─────────────┬────────────┘   └────────────────┬─────────────────┘
              │                                 │
              ▼                                 ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ Pipeline orchestrator    │   │ Data plane (future)              │
│ Scout→Brief→Craft→       │   │ Postgres · Auth · object store   │
│ Brush→Proof (stub|LLM)   │   │                                  │
└──────────────────────────┘   └──────────────────────────────────┘
```

### 2.1 MVP runtime topology

- Single Next.js app (App Router)
- In-memory / `localStorage` persistence for edit sessions & turns
- Pipeline via server route → orchestrator → role adapters (offline stub fixtures for demo reliability)
- No required external DB for pitch

### 2.2 Future runtime topology (solo default)

Opinionated post-hackathon stack — one vendor where possible ([FUTURE.md](./FUTURE.md)):

- Next.js web client
- **Supabase Auth** (email/password + Google OAuth; GitHub second)
- **Supabase Postgres** for users, sessions, edit turns, (later) projects/threads
- **Supabase Realtime** for edit-turn sync / presence
- Object storage for region thumbnails (Supabase Storage when needed)
- Optional preview sandbox/proxy for arbitrary URLs (F5+)

---

## 3. Recommended stack (solo defaults)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js** (App Router) + TypeScript | Speed, API routes, deployability |
| UI | React + **CSS Modules** (Tailwind only if already fluent) | Fewer moving parts; full visual control for design track |
| Animation | CSS first; Framer Motion only if needed | 2–3 signature motions (+ stage rail) |
| State | **Zustand** + edit-turn **reducer** function | Simple; same reducer later applies realtime events |
| Validation | Zod | Shared DTOs client/server |
| AI | Pipeline adapters (`Stub` default) | Demo never depends on network |
| Auth (future) | **Supabase Auth** | Solo default — see [FUTURE.md](./FUTURE.md) |
| DB (future) | **Supabase Postgres** | Same vendor as auth/realtime |
| Realtime (future) | **Supabase Realtime** | Edit-turn sync then presence |
| Testing | Vitest (math) + one Playwright smoke | Solo bandwidth |

### 3.1 Explicit non-choices (MVP)

- No microservices / per-agent deployables
- No Kubernetes
- No mandatory Redis / queue for pipeline stages
- No Figma Plugin API
- No headless browser farm for URL screenshots
- No auth UI, Supabase project, or websocket client in the hackathon build
- No second package/app unless monorepo already exists (prefer single Next app at repo root)
- No pin/critique/lens subsystem (retired product model)

---

## 4. Repository structure (target)

```
/
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── FUTURE.md
├── apps/web/                     # or root-level Next app if single package
│   ├── app/
│   │   ├── page.tsx              # marketing
│   │   ├── app/edit/page.tsx     # workspace
│   │   └── api/
│   │       └── pipeline/route.ts
│   ├── components/
│   │   ├── preview/
│   │   ├── lasso/
│   │   ├── instruct/
│   │   └── pipeline/             # optional stage rail
│   ├── lib/
│   │   ├── region/               # Scout (deterministic)
│   │   ├── pipeline/
│   │   │   ├── orchestrator.ts
│   │   │   ├── roles/            # brief, craft, brush, proof
│   │   │   └── stub/
│   │   ├── apply/
│   │   ├── session/
│   │   └── future/               # auth & realtime ports (interfaces only)
│   ├── samples/
│   │   └── landing/              # imperfect demo page
│   └── styles/
└── package.json
```

Monorepo optional; single Next app is fine for hackathon.

---

## 5. Core domain model

IDs use UUIDv4 strings everywhere so clients can create entities offline and sync later.

### 5.1 Entities

```ts
// Shared conceptual types (Zod schemas in lib/schemas)

type UserId = string;          // future
type ProjectId = string;       // future
type SessionId = string;       // edit session
type EditTurnId = string;
type RegionId = string;

type PipelineRole = "scout" | "brief" | "craft" | "brush" | "proof";
type PipelineStageStatus = "pending" | "running" | "done" | "failed" | "skipped";

interface Point {
  x: number; // CSS px relative to preview root
  y: number;
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionGeometry {
  id: RegionId;
  tool: "rect" | "freehand";
  bbox: BBox;
  path?: Point[];          // freehand polygon, preview coords
  createdAt: string;       // ISO
}

interface RegionFacts {
  colors: { hex: string; ratio: number }[];
  fonts: { family?: string; sizePx?: number; weight?: number }[];
  contrast?: { foreground: string; background: string; ratio: number; passAA: boolean }[];
  interactiveCount: number;
  linkCount: number;
  textSample?: string;
  domPathHints?: string[]; // e.g. ["button.cta", "section.hero"]
  targetIds?: string[];    // data-monet-id values under selection
}

interface EditBrief {
  restatedIntent: string;
  constraints: string[];
  successCriteria: string[];
  clarifyQuestion?: string; // if set, pipeline may halt before Craft
}

interface EditPlan {
  summary: string;
  targetIds: string[];
  changes: Array<{
    targetId: string;
    description: string;
    rationale?: string;
  }>;
}

interface SuggestionPayload {
  kind: "css-var" | "style-patch" | "class-toggle" | "text-replace";
  targetHint: string;      // selector or data-monet-id within sample
  patch: Record<string, unknown>;
  previewLabel: string;    // human label for Apply button
}

interface ProofResult {
  ok: boolean;
  notes: string;           // one line preferred
  reviseBrush?: boolean;   // request at most one Brush revision
  issues?: string[];
}

interface PipelineStage {
  role: PipelineRole;
  status: PipelineStageStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

interface EditTurn {
  id: EditTurnId;
  sessionId: SessionId;
  region: RegionGeometry;
  instruction: string;
  facts?: RegionFacts;           // Scout
  brief?: EditBrief;             // Brief
  plan?: EditPlan;               // Craft
  suggestion?: SuggestionPayload;// Brush
  proof?: ProofResult;           // Proof
  stages: PipelineStage[];
  outcomeSummary?: string;       // after apply
  applied: boolean;
  createdAt: string;
  updatedAt: string;
  // Future identity fields — optional in MVP
  authorId?: UserId;
  authorDisplayName?: string;
}

interface EditSession {
  id: SessionId;
  title: string;
  preview: {
    kind: "sample" | "html" | "url"; // url = future
    sampleId?: string;
    html?: string;
    url?: string;
  };
  turns: EditTurn[];
  createdAt: string;
  updatedAt: string;
  // Future
  projectId?: ProjectId;
  createdBy?: UserId;
}

// Future
interface Project {
  id: ProjectId;
  name: string;
  createdBy: UserId;
  createdAt: string;
}

type MemberRole = "owner" | "editor" | "commenter" | "viewer";

interface ProjectMember {
  projectId: ProjectId;
  userId: UserId;
  role: MemberRole;
}

interface TurnReply {
  id: string;
  turnId: EditTurnId;
  authorId: UserId;
  body: string;
  createdAt: string;
}
```

### 5.2 MVP persistence

| Data | Store |
|---|---|
| Active session + turns | Memory (Zustand) + `localStorage` key `monet.session.v1` |
| Applied suggestion stack | Memory (undo stack) |
| Demo pipeline fixtures | Static JSON modules keyed by region hint + instruction chip |

### 5.3 Future persistence (Postgres sketch)

```sql
users (id, email, name, avatar_url, created_at)
accounts / sessions / verifications  -- per auth library
projects (id, name, created_by, created_at)
project_members (project_id, user_id, role)
edit_sessions (id, project_id, title, preview_json, created_by, created_at)
edit_turns (
  id, session_id, author_id, instruction, applied,
  region_json, facts_json, brief_json, plan_json,
  suggestion_json, proof_json, stages_json, outcome_summary,
  created_at, updated_at
)
turn_replies (id, turn_id, author_id, body, created_at)
share_links (id, project_id, role, token_hash, revoked_at, created_at)
```

---

## 6. Client architecture

### 6.1 Layers

1. **Preview host** — renders sample page in a sandboxed iframe *or* in-app React sample with a known root `#monet-preview-root`.
2. **Overlay layer** — absolutely positioned above preview; handles pointer events in Select mode.
3. **Selection engine** — converts pointer strokes → `RegionGeometry`.
4. **Scout (region analyzer)** — samples DOM/canvas under region → `RegionFacts` (deterministic in MVP).
5. **Edit store** — CRUD for edit turns; selection↔turn linking; undo stack.
6. **Pipeline client** — calls `/api/pipeline` with geometry + facts + instruction; tracks stage statuses.
7. **Apply engine** — executes `SuggestionPayload` against preview document after Proof ok.

### 6.2 Mode machine

```
InteractMode  --toggle-->  SelectMode
SelectMode:
  idle → drawing → (optional) confirming → scouting → instructing → pipeline → applied
Esc from drawing/confirming → idle (clear draft)
```

### 6.3 Coordinate system

- Origin: top-left of preview root.
- Unit: CSS pixels at current preview zoom (MVP zoom = 1).
- Store geometry in preview-root coordinates, not viewport coordinates.
- On resize: either lock preview width or recompute scale transform; MVP should **fixed preview width** to avoid turn/region drift.

### 6.4 Preview strategies

| Strategy | Pros | Cons | MVP |
|---|---|---|---|
| A. In-app React sample | Easy DOM inspection, apply patches | Not a “real URL” | **Primary** |
| B. iframe sandbox same-origin HTML | Isolation | Apply/analyze via iframe doc access | Secondary |
| C. Cross-origin URL iframe | Realistic | CORS, no DOM access | Future + proxy |

**MVP decision:** Strategy A with a sample page component. Scout uses `elementFromPoint` sampling + DOM walk within bbox.

---

## 7. Selection engine (design-critical)

### 7.1 Requirements

| ID | Requirement |
|---|---|
| S1 | Rect tool: click-drag rectangle |
| S2 | Freehand tool: pointer path sampled ≥ 60 Hz when possible |
| S3 | Live stroke rendering under 16ms frame budget on M1-class laptops |
| S4 | On pointer up, compute bbox; freehand also stores simplified path |
| S5 | Hit-test selection markers without blocking draw layer inappropriately |
| S6 | `prefers-reduced-motion`: static dashed stroke instead of marching ants |

### 7.2 Path simplification

- Use Ramer–Douglas–Peucker (or equivalent) with epsilon ~1.5px to reduce points before storage/AI.
- Keep raw path in memory until confirmed if needed for redraw fidelity.

### 7.3 Scout / DOM sampling algorithm (MVP)

Given `bbox` (and optional path mask):

1. Build a grid of sample points inside bbox (e.g. 8×8).
2. For freehand, discard points outside polygon.
3. For each point, `elementsFromPoint` relative to preview root.
4. Collect candidate elements; rank by area overlap with bbox.
5. Extract:
   - computed colors (`color`, `backgroundColor`)
   - font metrics
   - roles (`button`, `a`, inputs)
   - `data-monet-id` targets
   - innerText snippets (truncated)
6. Contrast: pair likely fg/bg from same text node ancestry; compute WCAG relative luminance ratio.
7. Produce `RegionFacts`.

Scout runs **client-side** before `/api/pipeline` when possible so the UI can show facts immediately.

### 7.4 Overlay rendering

- SVG layer for stroke + fill + optional turn anchors.
- Turn anchors at region centroid; collision nudge if overlapping (simple spiral offset).

---

## 8. Agentic pipeline

### 8.1 Role contracts

Engineering aliases map to PRD product names:

| Product | Engineering | Responsibility |
|---|---|---|
| Scout | `AnalyzerRole` | Region facts + targets (MVP: deterministic; optional LLM enrich later) |
| Brief | `InterpreterRole` | Instruction → `EditBrief` |
| Craft | `DesignerRole` | Brief + facts → `EditPlan` |
| Brush | `ImplementerRole` | Plan → `SuggestionPayload` |
| Proof | `VerifierRole` | Plan + payload + facts → `ProofResult` |

```ts
interface PipelineRequest {
  sessionId: SessionId;
  instruction: string;
  region: RegionGeometry;
  facts: RegionFacts;
  pageContext: {
    sampleId?: string;
    title?: string;
    synopsis?: string;
  };
}

interface PipelineResponse {
  turn: Pick<
    EditTurn,
    "brief" | "plan" | "suggestion" | "proof" | "stages" | "outcomeSummary"
  >;
  model: string;       // e.g. "stub-pipeline" | "gpt-…"
  latencyMs: number;
}
```

```ts
interface RoleContext {
  req: PipelineRequest;
  brief?: EditBrief;
  plan?: EditPlan;
  suggestion?: SuggestionPayload;
  proof?: ProofResult;
  revisionNotes?: string; // from Proof → Brush
}

interface PipelineRoleHandler<TOut> {
  run(ctx: RoleContext): Promise<TOut>;
}

interface PipelineProvider {
  run(req: PipelineRequest): Promise<PipelineResponse>;
}
```

Implementations:

- `StubPipelineProvider` — deterministic fixtures keyed by region heuristic + instruction keywords (demo-safe)
- `HttpPipelineProvider` — orchestrates role prompts / tools; validates each stage with Zod

### 8.2 Orchestrator (MVP)

```
1. Scout facts already on request (client) — mark stage done
2. Brief.run → EditBrief
   - if clarifyQuestion set and policy=ask, return early without apply
3. Craft.run → EditPlan
4. Brush.run → SuggestionPayload
5. Proof.run → ProofResult
   - if !ok && reviseBrush: Brush.run once more with revisionNotes, then Proof.run again
   - if still !ok: return turn with applied=false and proof.notes
6. Return PipelineResponse (client Apply engine commits if proof.ok)
```

Rules:

- Stages are serial in MVP (no fan-out).
- Later stages must not invent new user intent beyond Brief.
- Cap total server time ~20s; on failure fall back to stub fixture with `model: "stub-fallback"`.
- Log role name + latency; do not log full page HTML.

### 8.3 API route (MVP)

`POST /api/pipeline`

- Input: `PipelineRequest`
- Output: `PipelineResponse`
- Server enforces max body size; strips unexpected keys
- Optional streaming later (`text/event-stream` of stage updates); MVP may return once complete
- Timeout ~20s; stub fallback on failure

### 8.4 Prompt contracts (hosted model)

Each LLM role gets a **narrow** system prompt and JSON schema:

- **Brief** — restate intent; list constraints; no CSS patches  
- **Craft** — plan only against provided `targetIds`; no whole-page redesign  
- **Brush** — emit only `SuggestionPayload`; reference `data-monet-id`s  
- **Proof** — check scope, safety, and measurable a11y criteria from Brief; one-line notes  

Do **not** use a single “evaluate this UI” megaprompt.

### 8.5 Demo reliability

- Prefetch/cache pipeline results for known demo lassos (hero CTA, nav, form) × instruction chips.
- UI shows Scout facts immediately; stage rail advances as roles complete (or instantly for stub).
- Stub fixtures must still populate `brief`, `plan`, `suggestion`, `proof` so the pipeline story is visible.

---

## 9. Auth (future technical requirements)

### 9.1 Goals

- Email + password
- OAuth: Google, GitHub
- Secure sessions
- Account linking (same email across OAuth + password — policy TBD)
- Migration path from anonymous `localStorage` sessions

### 9.2 Recommended approach

Use a dedicated auth library rather than hand-rolling crypto:

| Option | Notes |
|---|---|
| **Better Auth** | Email/password + OAuth, good TS DX |
| **Auth.js** | Broad OAuth; password via credentials provider |
| **Clerk** | Fastest UI; less control, vendor lock |

Solo default: **Supabase Auth + Postgres** ([FUTURE.md](./FUTURE.md) §4). Ports stay vendor-agnostic so this can change without UI rewrites.

### 9.3 Security requirements

| ID | Requirement |
|---|---|
| AU1 | Passwords hashed with modern KDF (argon2id/bcrypt via library) |
| AU2 | HTTPS only in production |
| AU3 | CSRF protection on cookie sessions |
| AU4 | HttpOnly + Secure + SameSite cookies |
| AU5 | Rate limit login / signup / reset |
| AU6 | OAuth state/nonce validated |
| AU7 | Minimum password length ≥ 8; breach checks optional later |
| AU8 | Session rotation on login |

### 9.4 Anonymous claim flow

1. MVP session stored with `sessionId` in `localStorage`.
2. On first authenticated save, `POST /api/sessions/claim` attaches session to `userId` / project.
3. Conflict policy: if server copy exists, prompt merge (future UI).

### 9.5 MVP code obligations for auth

- Keep a `lib/future/auth.ts` port:

```ts
export interface AuthPort {
  getCurrentUser(): Promise<{ id: string; email: string; name?: string } | null>;
}
```

- `EditTurn` already includes optional `authorId`.
- Do not hardcode “single local user” assumptions into sync logic.

---

## 10. Multiplayer (future technical requirements)

> Solo sequence: F0 cloud save → F1 share links → F2 edit-turn sync → F3 presence. Do not implement this section during MVP beyond ports/reducer. See [FUTURE.md](./FUTURE.md).

### 10.1 Concepts

- **Project** — authorization boundary  
- **EditSession** — realtime room  
- **Presence** — ephemeral user state  
- **Edit turns / replies** — durable shared state  

### 10.2 Realtime events

```ts
type RoomEvent =
  | { type: "turn.created"; turn: EditTurn; actorId: UserId }
  | { type: "turn.updated"; turnId: EditTurnId; patch: Partial<EditTurn>; actorId: UserId }
  | { type: "turn.deleted"; turnId: EditTurnId; actorId: UserId }
  | { type: "reply.created"; reply: TurnReply; actorId: UserId }
  | { type: "presence.upsert"; presence: PresenceState }
  | { type: "selection.draft"; actorId: UserId; region?: RegionGeometry }
  | { type: "pipeline.stage"; turnId: EditTurnId; stage: PipelineStage; actorId: UserId }
  | { type: "apply.performed"; actorId: UserId; turnId: EditTurnId; suggestion: SuggestionPayload };
```

```ts
interface PresenceState {
  userId: UserId;
  displayName: string;
  color: string;
  cursor?: Point;
  mode: "interact" | "select";
  pipelineRunning?: boolean;
  draftRegion?: RegionGeometry;
  updatedAt: string;
}
```

### 10.3 Consistency model

| Resource | Model |
|---|---|
| Edit turn fields | Last-write-wins with `updatedAt`; optional version field later |
| Turn create | Client UUID; server accepts idempotent create |
| Draft selection | Ephemeral; not durable; shown as ghost path |
| Apply mutations | Treat as session ops; broadcast; consider operational log later |

### 10.4 Authorization

- Room join requires project membership or valid share token.
- Server rejects events exceeding role permissions (PRD §8.3).
- Share links store token hashes only.

### 10.5 MVP code obligations for multiplayer

```ts
// lib/future/realtime.ts
export interface RealtimePort {
  join(sessionId: SessionId): Promise<void>;
  leave(): Promise<void>;
  publish(event: RoomEvent): void;
  subscribe(handler: (event: RoomEvent) => void): () => void;
}
```

- Edit store should apply events through a single reducer (`applyRoomEvent`) used by both local actions and future network events.
- UI may show disabled **Share** control with tooltip “Coming soon” (optional).

---

## 11. Apply engine

### 11.1 Supported MVP patch kinds

| Kind | Behavior |
|---|---|
| `style-patch` | `Object.assign(el.style, patch)` or set properties map |
| `class-toggle` | add/remove classes on `targetHint` |
| `css-var` | set CSS variables on preview root |
| `text-replace` | replace textContent for safe targets |

### 11.2 Safety

- Only allow selectors within preview root.
- Block `javascript:` and inline script injection in patches.
- Maintain undo stack: `{ turnId, inversePayload }[]`.
- Client should refuse apply when `proof.ok !== true` unless explicit override (MVP: no override in demo).

### 11.3 Determinism for demo

Sample page elements that are apply targets must have stable `data-monet-id` attributes:

```html
<button data-monet-id="hero-cta">Get started</button>
```

Brush suggestions from stub/AI should reference these IDs.

---

## 12. API surface

### 12.1 MVP

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/pipeline` | Run Scout→…→Proof for a region + instruction |
| GET | `/api/health` | Health check |

Optional:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/samples` | List demo samples |
| POST | `/api/export` | Return markdown summary of edit turns |

### 12.2 Future

| Method | Path | Purpose |
|---|---|---|
| * | `/api/auth/*` | Auth library routes |
| CRUD | `/api/projects` | Projects |
| CRUD | `/api/sessions` | Edit sessions |
| POST | `/api/sessions/:id/claim` | Claim anonymous session |
| CRUD | `/api/sessions/:id/turns` | Durable edit turns |
| POST | `/api/share-links` | Create/revoke links |
| WS/RT | realtime channel | Presence + events |

---

## 13. Frontend routes & rendering

| Route | Auth | Notes |
|---|---|---|
| `/` | public | Brand hero + CTA |
| `/app/edit` | public MVP | Main workspace |
| `/login` `/signup` | future | Auth pages |
| `/projects` | future protected | List |
| `/app/edit/[sessionId]` | future | Deep-linkable room |

SSR/SSG: marketing static; workspace client-heavy (`"use client"` islands).

Legacy `/app/review` may redirect to `/app/edit` if ever created.

---

## 14. Performance budgets

| Area | Budget |
|---|---|
| First workspace interactive | < 3s on broadband laptop |
| Lasso frame time | ≤ 16ms typical |
| Scout / region analysis | < 100ms for sample DOM |
| Pipeline TTFB (full) | < 2s warm stub; hosted < 8s typical |
| Per-role stub | < 50ms |
| Edit turns before virtualization needed | ~100 (MVP far below) |

---

## 15. Accessibility (engineering)

| ID | Requirement |
|---|---|
| E-A1 | All toolbar controls are buttons with `aria-label` |
| E-A2 | Edit history is a focusable list; canvas markers `aria-hidden` if redundant |
| E-A3 | Drawing instructions announced when entering Select mode (`aria-live`) |
| E-A4 | Focus not trapped unintentionally in panels |
| E-A5 | Honor `prefers-reduced-motion` |
| E-A6 | Pipeline success/failure via icon + text (not color alone) |
| E-A7 | Tab order: tools → instruct → facts/stages → history → preview interact (when interact mode) |
| E-A8 | Stage rail updates announced compactly via `aria-live="polite"` |

Selection itself is pointer-primary; provide rect creation via keyboard as P1 (arrow-moveable box) if time.

---

## 16. Security (MVP + future)

### MVP

- No secrets in client bundles; AI keys server-only.
- Sanitize any HTML sample input if paste-HTML ships.
- Cap pipeline input size (facts text truncation; instruction length limit).
- Proof / apply engine block unsafe selectors and script injection.

### Future

- RLS or server-side authz on all project/session queries.
- Share link brute-force resistance (entropy + rate limit).
- Preview proxy: SSRF protections (block link-local, metadata IPs).
- Content privacy: page HTML not logged in plaintext beyond retention window.

---

## 17. Observability

### MVP

- Client console breadcrumbs for demo debugging.
- API log: latency per role, success/fail (no raw page dumps).

### Future

- Structured logs + error tracking (Sentry).
- Product analytics: turn_started, pipeline_completed, suggestion_applied (privacy-aware).

---

## 18. Testing strategy

| Layer | What |
|---|---|
| Unit | BBox/path simplify, contrast ratio, polygon point-in, patch apply/undo, Proof rules |
| Component | Lasso tool state machine, instruct panel, stage rail |
| API | Pipeline Zod validation; stub provider; orchestrator revise-once |
| E2E smoke | Load sample → rect select → instruct → pipeline → apply → undo |
| Future | Auth flows; realtime dual-client turn sync |

---

## 19. Deployment

| Stage | Target |
|---|---|
| Hackathon | Vercel (or equivalent) for web; env for AI key |
| Future | Same + Postgres + realtime service + auth env vars |

Env vars (illustrative):

```
# MVP (optional hosted AI — stub pipeline works without these)
AI_API_KEY=
AI_MODEL=

# Future solo default — Supabase ([FUTURE.md](./FUTURE.md) §7)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 20. Implementation phases (solo engineering)

Hackathon = Phases 0–4. Phase 5 is a short stub pass. Cloud/collab = [FUTURE.md](./FUTURE.md) F0+.

### Phase 0 — Scaffold
- Next.js + TS + base styles + brand landing + empty workspace shell
- Sample landing page with `data-monet-id`s

### Phase 1 — Selection
- Overlay + rect + freehand
- RegionGeometry store
- Motion / marching ants
- **Gate:** do not advance until lasso feels good live

### Phase 2 — Scout + instruct UI
- DOM sampler → RegionFacts panel
- Instruct input + edit-turn model
- Optional stage rail chrome (static/disabled until Phase 3)

### Phase 3 — Pipeline + apply
- Orchestrator + role handlers + `/api/pipeline`
- Stub fixtures for demo regions (default path)
- Proof gate + Apply engine + undo

### Phase 4 — Craft
- A11y pass on chrome
- Reduced motion
- Stage-rail motion polish
- Demo script validation
- **Protect this phase** over any P1 feature

### Phase 5 — Future ports (≤2 hours)
- `AuthPort` / `RealtimePort` interfaces under `lib/future/`
- Reducer-based turn updates (`applyRoomEvent`)
- Optional `authorId` / `projectId` fields already on types
- Stop. No Supabase project during hackathon.

---

## 21. Technical risks

| Risk | Mitigation |
|---|---|
| iframe coordinate bugs | Prefer in-app sample root |
| AI flaky during pitch | Stub pipeline fallback + fixtures |
| Region drift on resize | Fixed preview width |
| Over-engineering auth now | Interfaces only; [FUTURE.md](./FUTURE.md) after ship |
| Realtime conflict complexity | LWW + ephemeral drafts; presence last |
| Scope into builder | One apply path; freeze non-goals |
| Pipeline role sprawl | Fixed five roles; no parallel specialists in MVP |
| Solo bandwidth | Skip P1; stub AI; fixed preview width |
| Vendor sprawl later | Supabase-first; avoid Clerk+Neon+PartyKit sandwich |

---

## 22. Acceptance criteria (MVP technical)

1. User can draw rect and freehand lassos over the sample page.
2. Selecting a region shows ≥3 Scout facts (e.g. colors, contrast, interactive count).
3. Submitting an instruction runs the pipeline and returns Brief + Plan + Suggestion + Proof (stub acceptable).
4. Optional stage rail reflects role progress (or completes instantly in stub mode).
5. At least one suggestion applies to the preview after Proof ok and can be undone.
6. Workspace usable via keyboard for primary chrome controls.
7. `prefers-reduced-motion` reduces lasso/stage/apply animation.
8. Code contains `AuthPort` and `RealtimePort` interfaces (or equivalent) and edit-turn reducer suitable for multiplayer events.
9. No AI secrets in client bundle.
10. Demo path runs without external network if stub mode enabled.
11. No pin/lens/critique API remains as the primary path.

---

## 23. Appendix — Demo fixture map

| Region hint | Instruction chip | Expected story |
|---|---|---|
| `hero-cta` | Contrast | Scout contrast fail → Craft recolor → Brush style-patch → Proof AA pass |
| `primary-nav` | Hierarchy | Competing destinations → plan reduces secondary emphasis → apply |
| `signup-form` | Focus / a11y | Focus ring + error affordances → Proof checks visibility |
| `hero-cta` | Primary CTA | CSS patch referencing `data-monet-id="hero-cta"` |

These fixtures back the `StubPipelineProvider` for pitch resilience.

---

## 24. Future reference

For post-hackathon auth, cloud save, share links, realtime, and presence — including a paste-ready resume checklist — use **[FUTURE.md](./FUTURE.md)**. This TRD remains the source of truth for types, events, pipeline roles, and security requirements; FUTURE.md is the solo execution order.
