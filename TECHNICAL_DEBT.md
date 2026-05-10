# Sinalytix — Technical Debt & Review Findings

> Generated: 2026-05-11  
> Scope: 3 apps (family, caregiver, patient) + shared packages + backend API  
> Review method: 4 parallel agents — infrastructure, design, health, DB/API contract

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fixed |
| 🔴 | Critical — production blocker |
| 🟠 | High — first sprint |
| 🟡 | Medium — backlog |
| ✔️ | Passing — no action needed |

---

## 1. Critical Issues (Blocking for test & production)

### ✅ 1.1 Family App backend router missing
**Was:** No `/family/*` router existed. All 15+ Family App API calls returned 404.  
**Fix:** Created `services/api/app/routers/family.py` and registered it in `main.py`.  
**Status:** Core endpoints live (profile, tasks, messaging, shifts, DND).  
Stubs in place (returning 501/null) for: symptoms, reports, approvals, SOS, Sina chat.

### ✅ 1.2 API field name mismatches (tasks)
**Was:** Frontend stores used field names inconsistent with backend `TodayTaskOut` schema.

| Backend field | Family (was) | Caregiver (was) | Fixed to |
|---|---|---|---|
| `type` | `type` ✅ | `task_type` ❌ | `type` |
| `progress_count` | `counter_value` ❌ | `counter_current` ❌ | `progress_count` |
| `target_per_day` | `daily_target` ❌ | `counter_target` ❌ | `target_per_day` |
| `created_by_actor_type` | `created_by_role` ❌ | `created_by_actor` ❌ | `created_by_actor_type` |
| `time_of_day_local` | `time_local` ❌ | `scheduled_time` ❌ | `time_of_day_local` |
| `date_local` | `date_local` ✅ | `assigned_date` ❌ | `date_local` |

**Fix:** Updated `apps/family/src/store/tasks.ts`, `apps/caregiver/src/store/tasks.ts`, `apps/caregiver/src/components/TaskItem.tsx`, and `apps/family/app/(main)/tasks.tsx`.

### ✅ 1.3 Message sender type mismatch
**Was:** Family store `Message` used `sender_id`, `sender_type: 'ai_agent'`, `is_ai_generated: boolean`.  
Backend `MessageOut` returns `sender_actor_id`, `sender_actor_type: 'agent'`, `source: 'manual'|'agent'`.  
**Fix:**
- `apps/family/src/store/messages.ts` — aligned to backend schema; `is_ai_generated` now computed via `toMessage()` helper (`source === 'agent'`)
- `apps/family/app/conversation/[id].tsx` — `sender_id` → `sender_actor_id`
- `services/api/app/schemas/messaging.py` — added `@computed_field` for `is_ai_generated`, `is_archived`, `is_group` on `ConversationOut` and `MessageOut`

### ✅ 1.4 Push token endpoints wrong (Caregiver + Family)
**Was:**
- Caregiver sent to `/notifications/caregiver/push-token` — **404**
- Family sent to `/family/push-token` — **404**  
- Family also silently swallowed errors without `platform` field

**Fix:** Both now call `/api/v1/notifications/push-token` (the correct backend endpoint) with `{ token, platform }`.  
Files: `apps/family/src/lib/push-notifications.ts`, `apps/caregiver/src/lib/push-notifications.ts`

---

## 2. High Priority (Fix before first external test session)

### 🟠 2.1 Caregiver & Family have no token refresh logic
**Impact:** Users are silently locked out when access token expires.  
**Patient app:** Has 401 intercept + auto-refresh in `api.ts` (lines 61–79).  
**Caregiver & Family:** `api.ts` has no refresh logic. On 401, request fails silently.  
**Fix needed:** Port Patient app's 401 intercept + `POST /api/v1/auth/refresh` retry to caregiver and family `api.ts`.  
**Files:** `apps/caregiver/src/lib/api.ts`, `apps/family/src/lib/api.ts`

### 🟠 2.2 Family app missing `(auth)` route guard
**Impact:** Routing guard in `apps/family/app/_layout.tsx` doesn't check `(auth)` segment, unlike caregiver and patient apps. Unauthenticated users could technically access non-onboarding routes.  
**Fix needed:** Add `const inAuth = segments[0] === '(auth)'` check to `_layout.tsx`.  
**File:** `apps/family/app/_layout.tsx`

### 🟠 2.3 Patient app `.env` has hardcoded LAN IP
**Was:** `EXPO_PUBLIC_API_URL=http://192.168.1.141:8000`  
**Impact:** Dev machine-specific — fails on any other network or device.  
**Fix needed:** Change to `http://localhost:8000` or extract to `.env.local` (gitignored).  
**File:** `apps/patient/.env` (or `apps/the-companion/.env`)

### 🟠 2.4 API endpoint versioning inconsistent
**Pattern mismatch:**
- Patient: `/api/v1/tasks`, `/api/v1/notifications/push-token`
- Caregiver: `/caregiver/...`, `/shifts/...` (no version prefix)
- Family: `/family/...` (no version prefix, matches caregiver pattern)

**Impact:** Cannot selectively version or deprecate app-specific routes.  
**Recommendation:** Standardize to `/api/v1/family/...` and `/api/v1/caregiver/...` in a future migration. Low priority for test phase.

---

## 3. Medium Priority (Backlog / Design Debt)

### 🟡 3.1 Caregiver & Family not using shared design token system
**Patient app:** 100% usage of `@sinalytix/ui` tokens (`COLORS`, `FONT_SIZE`, `SPACING`, `BORDER_RADIUS`).  
**Family:** `const BRAND = '#6366F1'` repeated in **22 files**. Zero token imports.  
**Caregiver:** `#059669` hardcoded inline in **50+ places**. Zero token imports.  
**Missing from token system:** Neutral colors `#9CA3AF`, `#6B7280`, `#F3F4F6` — used everywhere, undefined in `packages/ui/src/theme/tokens.ts`.

**Fix needed:**
1. Add missing neutrals to `packages/ui/src/theme/tokens.ts`
2. Add `FAMILY_BRAND = '#6366F1'` and `CAREGIVER_BRAND = '#059669'` to tokens
3. Migrate family/caregiver to import from `@sinalytix/ui`

### 🟡 3.2 No shared UI component library
**Status:** `packages/ui` exports only tokens — no reusable components.  
`TaskItem`, `AppHeader`, `SOSBanner`, `EmptyState` all built independently per app.  
**Fix needed:** Create `packages/ui/src/components/` with at minimum: `EmptyState`, `LoadingIndicator`, `SectionHeader`.

### 🟡 3.3 Typography & spacing not enforced by token scale
**Token scale has:** 6 font sizes, 6 spacing values, 5 border radius values.  
**Apps use:** 20+ font sizes, 15+ ad-hoc spacing values, 15+ border radius values.  
**Priority:** Low for test. Enforce on next design pass.

### 🟡 3.4 Silent error swallowing — 27 empty catch blocks
**Pattern:** `catch { }` or `.catch(() => {})` with no logging or error state.  
**Mostly intentional** (offline fallback, optimistic update rollback) but undocumented.  
**Fix needed:** Add `// offline-safe` or `// best-effort` comments; add non-PII telemetry in v1.  
**Worst offenders:** Family messaging store (5 catches), caregiver tasks store (4 catches).

### 🟡 3.5 No foreign key constraints in database
**Impact:** Orphan records possible on out-of-order deletes.  
**Affected relationships:**
- `task_occurrences.task_id` → `task_definitions.id`
- `messages.conversation_id` → `conversations.id`
- `conversation_members.conversation_id` → `conversations.id`
- `activity_logs.occurrence_id` → `task_occurrences.id`

**Fix needed:** New Alembic migration adding FK constraints with `ON DELETE CASCADE` where appropriate.  
**Priority:** Before production. Not urgent for test (controlled data).

---

## 4. Passing — No Action Needed

| Area | Status | Note |
|------|--------|------|
| TypeScript strict mode | ✔️ | All 3 apps: `strict: true` |
| Dependency versions | ✔️ | Expo 54, RN 0.81.5, React 19.1.4 aligned |
| Navigation routes | ✔️ | All `router.push()` targets have corresponding files |
| Null safety | ✔️ | `.find()` results guarded or coalesced |
| SaMD compliance (Health Canada) | ✔️ | Disclaimers on all AI outputs; medical advice blocked server-side |
| PIPEDA compliance | ✔️ | No PII in logs; SecureStore for all sensitive data; auth gates data |
| RHPA compliance (ON) | ✔️ | Medication tasks marked; no prescriptive language |
| StyleSheet consistency | ✔️ | All apps use `StyleSheet.create()` — no inline styles, no CSS-in-JS |
| Error handling UI | ✔️ | `Alert.alert()` consistently across all apps |
| Accessibility (MVP) | ✔️ | Interactive roles, no bare `Text` with `onPress` |
| TODO/FIXME comments | ✔️ | Zero in codebase |
| SecureStore key isolation | ✔️ | Caregiver: `caregiver_*`, Family: `family_*`, Patient: `auth_*` |

---

## 5. Family Router — Stub Status

The following endpoints exist in `family.py` but return stub responses (501 / empty).  
They need dedicated service implementations before testing those features.

| Endpoint | Status | Blocker |
|----------|--------|---------|
| `GET /family/patients/{id}/sos/active` | Stub (null) | needs `red_escalation_logs` query |
| `POST /family/patients/{id}/sos/dismiss` | Stub (no-op) | needs SOS state machine |
| `GET /family/symptoms/{id}` | 501 | needs `symptom_reports` table + service |
| `GET /family/patients/{id}/symptoms/latest-unread` | Stub (null) | same |
| `GET /family/patients/{id}/reports/{date}` | 501 | needs `daily_summary_logs` + service |
| `GET /family/patients/{id}/approvals` | Stub (empty list) | no approvals table yet |
| `PATCH /family/patients/{id}/approvals/{id}` | Stub (no-op) | same |
| `POST /family/sina/chat` | 501 | needs AI service family-scoped proxy |

---

## 6. Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-05-11 | Created family backend router | `services/api/app/routers/family.py` |
| 2026-05-11 | Registered family router in main.py | `services/api/app/main.py` |
| 2026-05-11 | Fixed push token endpoints (Family + Caregiver) | `apps/family/src/lib/push-notifications.ts`, `apps/caregiver/src/lib/push-notifications.ts` |
| 2026-05-11 | Aligned Family task store to backend schema | `apps/family/src/store/tasks.ts` |
| 2026-05-11 | Aligned Family message store to backend schema | `apps/family/src/store/messages.ts` |
| 2026-05-11 | Aligned Caregiver task store to backend schema | `apps/caregiver/src/store/tasks.ts` |
| 2026-05-11 | Updated Caregiver TaskItem for renamed fields | `apps/caregiver/src/components/TaskItem.tsx` |
| 2026-05-11 | Updated Family tasks screen for renamed fields | `apps/family/app/(main)/tasks.tsx` |
| 2026-05-11 | Updated Family conversation screen (sender_actor_id) | `apps/family/app/conversation/[id].tsx` |
| 2026-05-11 | Added computed fields to messaging schemas | `services/api/app/schemas/messaging.py` |
| 2026-05-11 | Added patient_id to CreateTaskIn schema | `services/api/app/schemas/tasks.py` |
