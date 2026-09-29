# Master Closing Checklist — DattaSeller

**Reference date:** 2026-09-29  
**Working branch:** `codex/master-closing-20260929`  
**Canonical base:** `hardening/phase-a-containment-clean @ 73bb48b52869861977189f8c0327019554e39ab6`

This is the persistent control record for the integral closing cycle. Statuses are evidence-based; `PARTIAL` or `BLOCKED_EXTERNAL` never become `PASS` merely because code, CI, a route, or a preview exists.

## Canonical reconciliation

| Item | Current evidence | Status |
| --- | --- | --- |
| Current local branch before isolation | `codex/ds-value-05-06-social-agent @ dc2ff638`; pre-existing changes preserved | RECONCILED |
| Remote canonical branch | `hardening/phase-a-containment-clean @ 73bb48b` | RECONCILED |
| Canonical CI | GitHub Actions run 35773720449, `success` | PASS |
| Open PRs against canonical | #21 is `DIRTY`; it is not a merge candidate | REQUIRES_REVIEW |
| Merged scope | #23, #24 and #26 are merged into the canonical lineage | RECONCILED |
| Production | Not changed or used for mutable validation | PRESERVED |

## Value-gate control

| Gate | Entry → usable outcome | Current status | Next proof / blocker |
| --- | --- | --- | --- |
| DS-VALUE-01 | niche + city → real sourced lead | PROVEN_REAL | Preserve evidence |
| DS-VALUE-02 | incomplete lead → sourced enrichment | PROVEN_REAL | Preserve evidence |
| DS-VALUE-03 | public site → factual diagnosis | PROVEN_REAL | Preserve evidence |
| DS-VALUE-04 | real lead → individualized redesign | PROVEN_REAL | Preserve evidence |
| DS-VALUE-05 | confirmed public profile → factual social audit | PROVEN_REAL | Preserve evidence |
| DS-VALUE-06 | factual audit → visual social demonstration | PROVEN_REAL | Preserve evidence |
| DS-VALUE-07 | proposal inputs → public opaque link, open, revoke | PARTIAL | HML publish/open/revoke with two tenants |
| DS-VALUE-08 | proposal → persisted Prospector-compliant draft | PARTIAL | HML persisted draft; controlled provider delivery after human review |
| DS-VALUE-09 | approved controlled email → provider ID, persistence, timeline, inbound match | PARTIAL | controlled mailbox + provider + HML runtime |
| DS-VALUE-10 | sent email / reply state → one eligible or cancelled follow-up | PARTIAL | both HML controlled scenarios |
| DS-VALUE-11 | niche + city → controlled commercial journey | MISSING | requires all 07–10 proof on isolated HML |

## Executable closing sequence

- [x] Reconcile Git, worktrees, PRs, CI, DattaBrain, contract, gates and graph.
- [x] Preserve main-worktree changes and create an isolated branch from canonical.
- [x] Reconcile the machine-readable gate statuses with merged #23/#24 evidence without overstating HML proof: DS-VALUE-07/08 are already `PARTIAL` with HML proof explicitly pending.
- [x] Audit public proposal, Prospector draft, send, follow-up, inbound and E2E paths for untested or unsafe gaps; the runner was corrected to begin with public discovery and factual diagnosis instead of fixtures.
- [x] Implement and test provider-authenticated commercial-reply ingestion: `POST /api/inbound/resend` verifies raw Svix input, retrieves the authenticated received message from Resend, matches the provider ID and intended recipient, then persists reply/audit/timeline. Tests cover invalid signature, provider failure, unmatched reply, cross-lead recipient mismatch and replay. HML proof remains required.
- [x] Run full regression, typecheck, build, diff check and secret scan on the resulting SHA. 258/258 PASS, typecheck/build/secret scan/diff check PASS; PR #27 CI ×2 and Vercel Preview PASS.
- [x] Add `pnpm closing:preflight`: one non-mutating report for all DS-07–11 dependencies, with names of the exact missing variables/resources and no secret output. Local configuration confirms HML database and E2E admin inputs; the current Supabase token receives `401` for HML administration.
- [x] Add `pnpm hml:commercial-replies:check` / `HML_APPLY=yes pnpm hml:commercial-replies:apply`: an HML-ref-protected, idempotent incremental migration check/apply with file, SHA-256, pending state and rollback-risk report. It rejects Production and cannot reapply the historical bootstrap chain to an existing HML.
- [ ] If credentials permit, provision only a zero-cost isolated HML and execute controlled E2E; otherwise record the exact external dependencies.
- [ ] Update DattaBrain after HML evidence exists; no HML proof may be promoted from this preparation work.
- [x] Prepare PR #27 (`CLEAN`, CI ×2 + Preview PASS before this readiness update; no merge requested).

## HML evidence — 2026-09-29

| Check | Reproducible evidence | Status |
| --- | --- | --- |
| Administration | Full Access token reads organization and `dattaseller-hml` (`qfwvkarvueuezeqfljbl`, `sa-east-1`, `ACTIVE_HEALTHY`) | PASS |
| Isolation | HML ref is explicitly distinct from the hard-coded Production ref; all mutable commands reject Production | PASS |
| Schema / security | 37 public tables; 20 RLS-enabled tables and 20 policies readable through HML administration | PASS |
| E2E identity | Existing confirmed Auth user has the existing `ds_users.role='admin'` mapping; its HML-only password was reset through Auth Admin and controlled login returns a session | PASS |
| Incremental migration | `20260929140724_add_commercial_email_replies.sql`, SHA-256 `42a6bb5030870df1e44bdaca2cea430b6d7daa23ac43930715a6c28b47ec4282`, applied only to HML; follow-up check reports all 3 columns and no pending change | PASS |
| HML commercial settings | provider, sender, reply-to and public-base configuration keys are present; values intentionally not recorded | PARTIAL |
| Closing preflight | `pnpm closing:preflight` now performs read-only HML admin/migration verification and reports only the remaining missing external resources | PARTIAL |

## External dependency ledger

| Dependency | Blocks | Does not block | Minimum human action if no technical alternative exists |
| --- | --- | --- | --- |
| DattaSeller HML admin/project access | migration status/apply and mutable HML proof for 07–11 | local audit, tests, code hardening, preflight | Grant a token that can administer the already configured HML ref (current token returns `401`) |
| Valid controlled E2E identity | authenticated HML flow | anonymous/local tests and preflight | Supply or authorize creation of an HML-only E2E identity |
| Preview bound exclusively to HML | served HML UI proof | local build and API/unit tests | Configure HML-only environment binding |
| Controlled mailbox and authorized sender | real delivery/reply proof | drafts, validation, idempotence tests | Authorize controlled mailbox/sender for test-only traffic |
| Resend webhook secret and Preview URL | signed inbound proof and public proposal proof | endpoint/unit tests | Configure `RESEND_WEBHOOK_SECRET` and an HML-only `DS_E2E_BASE_URL` |
| `GRAPH_SYNC_MISSING` — Graph copy in isolated worktree | graph queries after code changes | source inspection and tests | `graphify update .` was attempted and failed only on write access to `graphify-out`; refresh/copy it after this reviewable change is merged |

## Completion rule

`RELEASE_CANDIDATE = PASS` only when every DS-VALUE-01 through DS-VALUE-11 is `PROVEN_REAL` with reproducible evidence. `PRODUCTION_READY` is out of scope until that condition and explicit Production authorization both exist.
