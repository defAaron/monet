# Monet — Future Reference (Solo Builder)

| Field | Value |
|---|---|
| **Audience** | Solo builder (post-hackathon) |
| **Companions** | [PRD.md](./PRD.md) · [TRD.md](./TRD.md) |
| **Last updated** | 2026-08-11 |

This is the **single place** to resume auth, multiplayer, and platform work after the hackathon. Do not expand this during MVP unless a decision must be recorded.

---

## 1. Solo operating rules

1. **Ship vertical slices**, not platform layers. Auth alone is not a slice; “sign in → save session → reopen on another device” is.
2. **One vendor where possible.** Prefer Supabase (Auth + Postgres + Realtime) over assembling Clerk + Neon + PartyKit unless there is a concrete reason.
3. **No rewrite of selection / pipeline.** Future work plugs into `AuthPort`, `RealtimePort`, and the edit-turn reducer (see TRD).
4. **Collaboration is a product feature for users**, not something you need a co-founder to build. Build it only after solo cloud save works.
5. **Timebox.** If a future phase slips, cut presence/cursors before cutting durable edit-turn sync.
6. **Keep the five MVP roles.** Add parallel specialist Craft agents only after F2, and only one specialty at a time.

---

## 2. What MVP must leave behind

Checklist before calling hackathon “done enough to integrate later”:

| Leftover | Why |
|---|---|
| UUID `sessionId` / `editTurnId` | Idempotent sync |
| Optional `authorId` on edit turns | Attribution without migration pain |
| Edit-turn updates via a single reducer | Local + realtime same path |
| Pipeline orchestrator + role modules | Swap stub → hosted without UI rewrite |
| `lib/future/auth.ts` → `AuthPort` | Swap stub → Supabase session |
| `lib/future/realtime.ts` → `RealtimePort` | Swap no-op → channel |
| `localStorage` schema versioned (`monet.session.v1`) | Claim/migrate anonymous work |
| Stable `data-monet-id` on sample targets | Apply engine stays demoable |

If any of these are missing, add them before starting auth UI.

---

## 3. Post-hackathon build order (solo)

### Phase F0 — Cloud save (solo account)

**Outcome:** You can sign in, save an edit session, reload it later.

- Email + password + Google OAuth (GitHub optional second)
- `users` + `edit_sessions` + `edit_turns` tables
- Claim flow: anonymous `localStorage` → owned session
- No invites, no presence

**Done when:** Two browsers, same account, same edit turns.

### Phase F1 — Share link (async collab)

**Outcome:** Someone opens a link and can view or instruct without a full “room” UX.

- `share_links` with role `viewer` | `commenter`
- Server authz on turn create / pipeline run
- Turn authorship + timestamps
- Optional discuss-on-turn replies

**Done when:** Incognito user runs an instruct → apply via link; you see it after refresh (realtime optional here).

### Phase F2 — Realtime sync

**Outcome:** Two cursors optional; edit turns appear live.

- Supabase Realtime (or equivalent) on `edit_turns`
- Wire `RealtimePort.publish/subscribe` to reducer
- Optional `pipeline.stage` events for live stage rails
- Reconnect without silent loss

**Done when:** Two windows show turn create / apply within ~1s.

### Phase F3 — Presence + selection ghosts

**Outcome:** Live cursors + draft lasso ghosts.

- `presence.upsert` / `selection.draft` events
- Soft-lock while drawing (ephemeral)
- Avatar stack in chrome
- Optional “pipeline running” presence flag

**Cut first if tired:** cursors; keep edit-turn sync.

### Phase F4 — Projects & roles

**Outcome:** Multi-session projects with owner/editor/commenter/viewer.

- `projects` + `project_members`
- Invite by email
- Move share links under projects

### Phase F5 — Platform expansions (only after F2)

Pick **one** at a time:

1. URL preview via SSRF-safe proxy  
2. Chrome extension (lasso any live site → pipeline)  
3. Export / Linear / GitHub issue from edit turns  
4. Design-token-aware Craft/Brush  
5. Parallel specialist Craft roles (e.g. a11y Craft) behind the same orchestrator  

---

## 4. Auth — decisions for later

| Decision | Solo default | Notes |
|---|---|---|
| Provider | **Supabase Auth** | Email/password + OAuth in one place with DB |
| OAuth | Google first, GitHub second | Both listed in PRD; don’t block F0 on both |
| Sessions | HTTP-only cookies or Supabase SSR helpers | Follow library guidance; don’t hand-roll |
| Anonymous claim | Required in F0 | Core solo → multi-device story |
| UI | Custom Monet-styled forms | Avoid stock “purple SaaS” auth chrome |

Full requirement IDs: PRD §8.1 · security: TRD §9.3.

---

## 5. Multiplayer — decisions for later

| Decision | Solo default | Notes |
|---|---|---|
| Consistency | Last-write-wins on edit-turn fields | Good enough until F4 |
| Draft lassos | Ephemeral only | Never persist drafts |
| Roles | Start with owner + commenter via link | Add editor/viewer in F4 |
| Presence | After turn sync works | F3, not F2 |
| Hardening | Rate limits + revoke links | Before any public launch |

Full requirement IDs: PRD §8.2–8.4 · events: TRD §10.

---

## 6. Suggested schema touch order

1. `users` (via Supabase Auth)  
2. `edit_sessions`  
3. `edit_turns`  
4. `share_links`  
5. `turn_replies`  
6. `projects` + `project_members`  

SQL sketch lives in TRD §5.3 — copy forward, don’t invent a second source of truth.

---

## 7. Env vars to expect later

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server only
AI_API_KEY=                      # already in MVP if hosted
AI_MODEL=
```

Deprecate separate `DATABASE_URL` / `REALTIME_URL` / OAuth client secrets **if** Supabase owns those. If you later leave Supabase, reintroduce explicit vars from TRD §19.

---

## 8. Explicitly out of scope until post-F2

- End-to-end encrypted page contents  
- CRDT/OT for edit-turn bodies  
- SSO / SAML  
- Org billing seats  
- Figma plugin  
- Mobile native apps  
- Per-role microservice deploys  

---

## 9. Resume checklist (paste into a new chat)

```
I'm the solo builder of Monet.
Read docs/PRD.md, docs/TRD.md, and docs/FUTURE.md.
MVP is shipped (local-first agentic edit pipeline: Scout→Brief→Craft→Brush→Proof).
Implement the next future phase: F0 Cloud save (solo account)
using Supabase Auth + Postgres, claiming localStorage sessions.
Do not build presence or share links yet.
Keep AuthPort / RealtimePort boundaries and the pipeline orchestrator.
```

Bump the phase name in that checklist as you advance (F1, F2, …).
