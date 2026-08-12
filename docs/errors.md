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

