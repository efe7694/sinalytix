# Legacy Backend Harvest — non-obvious rules to preserve in the R2 rewrite

The old Python backend (`services/api`) is being retired. Most of it is either
plain CRUD, an outright stub, or a facade (see the full audit in this session's
history). But the genuinely-functional parts encode a handful of **non-obvious
domain rules** the canonical spec may under-specify. This file exists so those
rules are folded into each rewrite phase deliberately, not rediscovered by bug.

Audited 2026-07-05. Every rule cites the legacy `file:line` it came from.
Nothing here is a mandate to copy code — it's a checklist of behavior to
reproduce (or consciously reject) when the corresponding phase is built.

## Global reality checks (independent of any one phase)
- **SMS/OTP is fake in BOTH backends** — the code only logs the OTP
  (`services/api/app/services/auth_service.py:87`; core-api's `otp.service.ts`
  does the same). A real SMS provider is a hard pre-launch dependency, not a
  backend-migration concern.
- **AI/Sina has no implementation anywhere** — legacy `sina_service.py` returns a
  canned string; `AI_SERVICE_URL` is defined but called by nothing. Faz 6 is
  pure greenfield.
- **Push (APNs/FCM/Expo) is unimplemented** — tokens are stored, nothing is ever
  dispatched.
- **No background jobs/cron exist** — occurrence generation is lazy-on-read;
  account-purge and 24h-overrun alerts have flags but no caller. Any phase that
  assumes a scheduler must introduce one (job-runner phase), not assume it exists.
- **`users` table has `display_name`, NOT `first_name`/`last_name`** in the
  legacy DB — several legacy family endpoints crash on this. The new core-api
  schema already splits names correctly; just don't copy the legacy read shape.

## Faz 2 — Task engine + shifts

### Tasks (`services/api/app/services/task_service.py`) — WORKING, port the rules
- **Lazy occurrence generation**: today's `TaskOccurrence` rows are generated on
  `GET /tasks/today`, not by a cron (`:57`, `:225-246`). Deliberate "no scheduler
  in V0" design.
- **Undo window is 10s server-side though the UI shows 5s** — intentional +5s for
  network latency (`:34`, `:143-146`). Do not tighten to 5s on the server.
- **Counter tasks auto-complete** when `progress_count >= target_per_day`
  (`:195-199`).
- **Weekly recurrence** matches `calendar.day_abbr[...].upper()` against
  `days_of_week` (`:210-222`) — a specific string-format contract.

### Shifts (`shift_service.py`) — WORKING
- **Atomic auto-switch**: checkout-old (reason `auto_switch`) + open-new in a
  single commit (`:94-128`).
- **Structured 409 on double check-in**: returns `active_shift_id` /
  `active_patient_id` so the app can render the switch-confirmation popup
  (`:44-53`). The frontend depends on this exact payload shape.
- 24h-overrun alert flag (`mark_24h_alert_sent`, `:160-164`) exists but has no
  caller — the alert itself is unbuilt; build it with the job-runner.

## Faz 3 — Notifications + messaging

### Messaging (`messaging_service.py`) — WORKING
- **2-year retention**: `expires_at = now + 365*2 days` on insert (`:85`).
- Per-reader read receipts (`MessageReadStatus`), 80-char last-message preview
  truncation (`:169-179`).
- **Bug to NOT carry**: unread counts are an N+1 loop (`:145-166`) — do it in one
  aggregate query.
- Legacy only lets patients send (`sender_actor_type` hardcoded PATIENT,
  `:89-90`); the rewrite must support caregiver/family senders properly.

### Notifications (`notifications_service.py`) — plumbing only
- Redirect-only model (`redirect_target`/`redirect_params`, 7 `NotificationType`s).
- Retention: 30d in UI, 1yr in DB (`:14`).
- No producer path and no push dispatch exist — both are net-new work.

## Faz 4 — SOS + symptom + calls

### Calls (`calls_service.py`) — WORKING, but mind the architecture
- **The SOS escalation state machine (2-phase escalation, 911 chain, availability
  gating) is NOT server-side** — it lives in the frontend/native dialer. The
  backend only (a) reports who's reachable and (b) records `CallAttemptLog` after
  the fact. Do NOT design the rewrite assuming the server orchestrates SOS.
- **Availability fallback chain**: active-shift caregiver phone → user phone
  (`:61-68`).
- `CallCancelStage` enum records which escalation stage a call was cancelled at
  (`enums.py:325-333`).

### Symptom / daily report (legacy family router) — FACADE, greenfield
- `symptom detail`, `daily report` are `501`; `latest-unread symptom` is
  `return None # TODO`. Nothing to harvest — build from PRD.

## Faz 5 — HCP
- No legacy code exists at all. Fully greenfield (starts after Faz 2's task engine
  per the phase plan).

## Faz 6 — AI / Sina — greenfield, but preserve the intended contract shape
- No behavior to harvest (it's a stub), but the **data/enum contract** encodes the
  PRD intent worth reusing:
  - `RedEscalationLog` field set (`sina_service.py:153-166`).
  - Enums (`enums.py:374-417`): `JudgeCategory` (4 LLM-judge categories),
    `RiskLevel` (low/med/high), `VoiceSessionStatus`, `ActionType`.
  - `_AUTO_CONFIRM_MAP` rule: green/LOW → 10s auto-confirm; MED/HIGH → manual
    (`sina_service.py:39`).

## Auth (already migrated to core-api Faz 0) — rules already reproduced / to verify
- Refresh-token rotation: sha256(jti) → Redis `active`/`revoked`, old token
  revoked on rotation (`auth_service.py:57-59`, `202-216`). core-api's session
  model supersedes this; no action needed.
- OTP rate-limit nuance: 3 sends / 10 min per phone, a separate 3-attempt counter
  per code, counter reset on resend (`auth_service.py:65-121`). Verify core-api's
  OTP limiter matches this intent.
- Legacy `oauth_accounts` table was never migrated (`models/user.py:73-76`), so
  Apple/Google login would fail against a real legacy DB — core-api's
  `oauth_identities` (D5) already fixes this.

## Access-control rule worth preserving (family)
- Legacy family↔patient access is gated on
  `EmergencyContact.linked_family_user_id` (403 if absent, `family.py:51-68`).
  The new schema already carries `linked_family_user_id` on `emergency_contacts`
  (Slice 2) and the Slice 3 family-link fabric formalizes this — keep that gate.
