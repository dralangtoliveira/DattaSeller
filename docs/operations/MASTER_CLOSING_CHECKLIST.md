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
- [ ] Reconcile the stale local machine-readable gate statuses with merged #23/#24 evidence without overstating HML proof.
- [x] Audit public proposal, Prospector draft, send, follow-up, inbound and E2E paths for untested or unsafe gaps; the runner was corrected to begin with public discovery and factual diagnosis instead of fixtures.
- [ ] Run full regression, typecheck, build, diff check and secret scan on the resulting SHA. Targeted gates 07–11 plus discovery: 34/34 PASS.
- [x] Run non-mutating authenticated-E2E preflight and classify every missing prerequisite precisely: base URL, HML admin identity, HML URL/ref/key, controlled mailbox, niche/city and explicit confirmation are absent from the isolated worktree.
- [ ] If credentials permit, provision only a zero-cost isolated HML and execute controlled E2E; otherwise record the exact external dependencies.
- [ ] Update DattaBrain from verified evidence and prepare a reviewable PR.

## External dependency ledger

| Dependency | Blocks | Does not block | Minimum human action if no technical alternative exists |
| --- | --- | --- | --- |
| DattaSeller HML admin/project access | mutable HML proof for 07–11 | local audit, tests, code hardening, preflight | Grant scoped HML access or reactivate/provision isolated HML |
| Valid controlled E2E identity | authenticated HML flow | anonymous/local tests and preflight | Supply or authorize creation of an HML-only E2E identity |
| Preview bound exclusively to HML | served HML UI proof | local build and API/unit tests | Configure HML-only environment binding |
| Controlled mailbox and authorized sender | real delivery/reply proof | drafts, validation, idempotence tests | Authorize controlled mailbox/sender for test-only traffic |
| `GRAPH_SYNC_MISSING` — Graph copy in isolated worktree | graph queries after code changes | source inspection and tests | `graphify update .` was attempted and failed only on write access to `graphify-out`; refresh/copy it after this reviewable change is merged |

## Completion rule

`RELEASE_CANDIDATE = PASS` only when every DS-VALUE-01 through DS-VALUE-11 is `PROVEN_REAL` with reproducible evidence. `PRODUCTION_READY` is out of scope until that condition and explicit Production authorization both exist.
