# Lasso — Error Log

| Field | Value |
|---|---|
| **Audience** | Solo builder + agents |
| **Purpose** | Record failures so they are not repeated |
| **Last updated** | 2026-08-11 |

Append a new entry **whenever** an error is hit and resolved (build, runtime, tooling, integration, demo). Newest entries at the top.

---

## How to log

Copy the template below. Fill every field; leave `Future notes` blank only if there is truly nothing preventive to say.

```markdown
### E-NNN — Short title

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Area** | e.g. selection / pins / apply / AI / storage / tooling |
| **Symptoms** | What you saw (error text, bad UI, failed command) |
| **Cause** | Root cause (not the symptom) |
| **Fix** | What changed to resolve it |
| **Future notes** | Habits, checks, or guardrails so it does not recur |
```

---

## Entries

### E-006 — Stale `.next` chunks after concurrent build/dev → MODULE_NOT_FOUND 500s

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | tooling / Next.js |
| **Symptoms** | `/` and `/app` return 500; server log `Cannot find module './331.js'` (or `@swc.js`) from `.next/server/webpack-runtime.js`; occasional SegmentViewNode client-manifest errors |
| **Cause** | Running `next build` (or a second `next dev`) while another `next dev` still owned `.next`, leaving the webpack runtime pointing at deleted/renamed chunk files |
| **Fix** | Stop all Next processes, `rm -rf .next`, start a single `npm run dev` |
| **Future notes** | Never run `next build` against a live `next dev` cache; if 500s mention missing `./NNN.js` under `.next/server`, clear `.next` before debugging app code |

### E-005 — Zustand selector returns new object → React 19 getSnapshot loop

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | session / instruct UI |
| **Symptoms** | Console: `The result of getSnapshot should be cached to avoid an infinite loop`; Fast Refresh full reloads on `/app` |
| **Cause** | `InstructMount` selected `resolveOutcomeSummary(...)` inside `useSessionStore`, which allocates a new `{ text, ok }` every snapshot read; React 19 `useSyncExternalStore` requires referential stability |
| **Fix** | Select the stable last `EditTurn` from the store; call `resolveOutcomeSummary` during render outside the selector |
| **Future notes** | Never return freshly created objects/arrays from Zustand selectors under React 19; select stable state slices and derive in render, or use `useShallow` |

### E-004 — Grammarly attributes on `<body>` cause hydration mismatch warning

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | layout / SSR |
| **Symptoms** | Console hydration mismatch on `/app` showing `data-gr-ext-installed` / `data-new-gr-c-s-check-loaded` on `<body>` |
| **Cause** | Grammarly (browser extension) injects attributes onto `<body>` before React hydrates; not an app SSR/client branch bug |
| **Fix** | `suppressHydrationWarning` on `<html>` and `<body>` in `app/layout.tsx` |
| **Future notes** | If a hydration diff only lists `data-gr-*` / similar extension attrs, fix with suppress on the root elements — don’t chase store/Date.now first |

### E-003 — CSS Modules rejects pure `:global` apply-hook selectors

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | preview / sample / CSS Modules |
| **Symptoms** | Next.js build failed on `/app` with `Selector ":global([data-monet-id=...])" is not pure (pure selectors must contain at least one local class or id)` in `SampleLanding.module.css` |
| **Cause** | Apply-hook rules used top-level `:global(...)` only; CSS Modules purity requires every selector to include a local class or id |
| **Fix** | Nest all impure `:global` apply-hook selectors under the existing local `.root` class |
| **Future notes** | In `*.module.css`, never ship a selector that is only `:global(...)`; always scope under a local class (e.g. `.root :global(...)`) when toggling global demo classes |

### E-002 — Rect / Freehand tool buttons ignore clicks

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | selection / toolbar |
| **Symptoms** | Rect and Freehand buttons in the tools rail did not respond to clicks |
| **Cause** | Buttons were `disabled` unless workspace mode was already Select; default mode is Interact, so tool picks were blocked |
| **Fix** | Keep Rect/Freehand always clickable; choosing a tool sets `selectionTool` and enters Select mode |
| **Future notes** | Prefer enabling primary tool controls and switching mode on pick over gating tools behind a separate mode toggle |

### E-001 — `next dev` fails under sandbox network host lookup

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Area** | tooling |
| **Symptoms** | `npm run dev` crashed with `uv_interface_addresses returned Unknown system error 1` from Next’s `get-network-host` |
| **Cause** | Sandboxed process could not read OS network interfaces while Next tried to resolve LAN hosts for the ready banner |
| **Fix** | Run `next dev` outside the sandbox (`required_permissions: ["all"]`) and bind explicitly with `-H 127.0.0.1` |
| **Future notes** | For local smoke checks, prefer `npm run dev -- -H 127.0.0.1`; don’t treat this as an app bug if `next build` already passes |

