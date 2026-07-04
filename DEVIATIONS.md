# DEVIATIONS.md

Log of places where the R2 spec set (Canonical Data Dictionary v0.2 + Core Infra Modules 1-4 + app PRDs) had a genuine gap or conflict with reality, the decision applied, and why. Per the kickoff instructions: real spec gaps get a silent, reasonable resolution + an entry here, not a blocked question.

---

## D0 — Stack: TypeScript modular monolith replacing the existing Python/FastAPI backend

Not a spec gap — an explicit user decision (confirmed via direct question at the start of this rewrite): the existing Python/FastAPI + MedGemma backend (`services/api`, `services/ai`, 1 commit dated 2026-05-11) is retired in favor of the literal R2 architecture (TypeScript, NestJS, Azure OpenAI later). `services/api` and `services/ai` are left in place untouched (still the only working backend for the 3 existing apps) and will be deleted in a dedicated cleanup commit once the new backend reaches functional parity — not deleted now.

Framework/tooling choices made within that agreed architecture (not spec deviations, Module 3 doesn't mandate a specific library):
- **NestJS** (`@nestjs/platform-fastify`) for `core-api` — its modules/guards/interceptors map directly onto Module 3's named domain services + PolicyEngine/AuditWriter shape.
- **`@nestjs/platform-ws`** (raw `ws`), not Socket.IO, for `ws-gateway` — Module 2 §4 specifies a literal custom JSON envelope over `wss://`, not Socket.IO's protocol.
- **BullMQ** for `job-runner`/`ingestion-worker` — Redis-backed, already have Redis in `infra/docker/docker-compose.yml`.
- **node-pg-migrate** (migrations, via `pgm.sql(...)` for reviewable raw SQL) + **Kysely** (typed query builder, no ORM entity mapping) — chosen over Prisma because RLS needs per-request `SET LOCAL` session variables inside a transaction, which Prisma handles poorly in a pooled setup.

---

## D1 — `packages/domain` instead of overhauling `packages/shared` in place

**Plan said:** overhaul `packages/shared` in place with canonical enums/types.

**Reality found:** the 3 existing apps (patient/family/caregiver) import old pre-R2 types from `@sinalytix/shared` (`TaskType`, `TaskSubtype`, `NotificationType`, `ActorType`, `OnboardingDraftSchema`, etc.) in live screens/stores (e.g. `apps/patient/app/add-task.tsx`, `apps/*/src/store/onboarding.ts`, `apps/*/src/store/notifications.ts`). Rewriting `packages/shared` to match the R2 dictionary would rename/remove values the old apps still reference, breaking `pnpm turbo run lint type-check` for apps explicitly out of scope for this pass (they still run against the old Python backend until their own rewiring phase).

**Decision:** created a new package, `@sinalytix/domain`, holding only R2-canonical types (mirrors the Dictionary exactly, no legacy naming). `packages/shared` is left untouched and keeps serving the 3 existing apps as-is. `packages/domain` is consumed by the new TS backend (`services/core-api` etc.) and will be adopted by each app's own screens/stores as they get rewired to the new API in their respective phase — at that point the corresponding pieces of `packages/shared` are retired in the same commit that rewires that app (not before).

**Why this is safe:** no naming collisions in practice — the old and new enums cover the same domains but with different value sets (e.g. old `NotificationType` has 7 values, new canonical taxonomy v2 has 20+), so keeping them in separate packages prevents an app from accidentally importing a half-migrated type.

---

## D2 — New backend uses a separate database name (`sinalytix_core`), same Postgres server

**Found:** the legacy Python/Alembic backend already owns tables named `users`, `sessions`, etc. in the `sinalytix` database that `infra/docker/docker-compose.yml` provisions — the exact canonical table names Module 1 requires for the new schema. Migrating into the same database would collide immediately.

**Decision:** the new schema lives in a second database, `sinalytix_core`, on the *same* local Postgres server/container (no docker-compose changes — Postgres trivially hosts multiple databases per instance). `packages/db`'s `db:create` script creates it idempotently if missing. This keeps the legacy backend's data completely untouched during the transition and avoids schema-namespacing workarounds. Production topology (single logical DB, Module 1 §1.1) is unaffected — this is purely a local-dev/transition-period detail resolved once the Python backend is deleted and `sinalytix_core` (or a renamed `sinalytix`) becomes the only database.

---

## D3 — Faz 0 schema scoping notes (minor, non-blocking)

- **`AuditLogEntry` not partitioned yet.** Module 1 §8.1 specifies monthly partitions; the job that rolls partitions forward (J8, Module 3 §4) doesn't exist until job-runner is populated in a later phase. Built as a plain table now; partitioning added alongside J8 rather than half-built with nothing to maintain it.
- **`RecoveryToken` table exists, no endpoint yet.** Module 1 §3.5 lists it as a primitive, but Module 2 §3.1's Faz-0 endpoint list has no password-reset/account-recovery contract. Table created (cheap, matches the dictionary); no route built until a contract is specified — avoids inventing an unspec'd auth flow.
- **`AdminUser.admin_role`** stored as free text, not a CHECK-constrained enum — Module 1 §3.2 names examples ("kredensiyel inceleme, kurtarma, uyumluluk") but never gives an exhaustive value set.
- **`login_attempts`/`ip_blocks`** are openly readable/insertable at the RLS layer (no owner column to scope by) — they're pre-auth security telemetry the app must query for rate-limiting before any acting user is established, not tenant/PHI data.
- **`X-Platform` header (new, not in Module 2 §1.3's header table).** `Session.platform` is populated at session creation (signup/login/otp-verify/mfa-complete) but Module 2 never specifies how the client communicates it — added a request header for exactly those endpoints, since `X-App-Context` (which *is* in the spec) is only meaningfully enforced against an existing session's value for already-authenticated routes.

---

## D4 — New backend packages ship compiled `dist/`, not raw `src/*.ts`, as `main`

`packages/shared` (and `ui`/`api-client`) point `main` at `./src/index.ts` because they're only ever consumed by Expo/Metro, which bundles raw TS from `node_modules` directly. `services/core-api` is a plain Node/NestJS process built with real `tsc` (required — NestJS's DI depends on `emitDecoratorMetadata`, which esbuild/tsx/swc don't support, ruling out a tsx-based dev loop). Plain Node can't `require()` a `.ts` file, so `@sinalytix/domain`, `@sinalytix/db`, `@sinalytix/policy-engine`, `@sinalytix/audit` point `main`/`types` at `./dist/index.js`/`.d.ts` instead, and `turbo.json`'s `dev` task now `dependsOn: ["^build"]` so `pnpm turbo run dev --filter=@sinalytix/core-api` builds them first automatically.

**D4b follow-up:** those same 4 packages' tsconfigs originally used `module: "ESNext"` (copied from `packages/shared`'s convention), producing extension-less `export * from './types'` output. Without `"type": "module"` in their `package.json`, Node's loader can't resolve that at runtime (`ERR_MODULE_NOT_FOUND`) — found only once `core-api` was actually booted (`pnpm turbo run dev`), not by the test suite. Since these packages are only ever consumed by `core-api` (CommonJS), switched all four to `module: "CommonJS"` / `moduleResolution: "node"`.

---

## D5 — Added `oauth_identities` table (not in the Canonical Dictionary)

Find-or-create SSO login (`apple_sso`/`google_sso`, Module 2 §3.1) needs a durable mapping from the provider's verified subject claim to a `User.user_id`. Neither Module 1 nor the Dictionary defines such a table — matching by email alone would be wrong (Apple private-relay emails, email changes over time). Added `oauth_identities` (provider, provider_subject, user_id) as an infra-internal table, the same category Module 3 already uses for `event_outbox`/`job_runs` — required for the system to work, not a canonical domain entity. See `packages/db/migrations/0006_oauth-identities.js`.

## D6 — Signup vs. login vs. OTP division of responsibility (interpretation)

Module 2 §3.1 lists `/auth/signup`, `/auth/otp/request+verify`, and `/auth/login` but only gives one fully worked example (the OTP flow) — it doesn't spell out which auth_methods go through which endpoint, or whether signup/login are find-or-create vs. find-only. Implemented as:
- **`phone_otp`** goes exclusively through `/auth/otp/request` + `/auth/otp/verify` (find-or-create on verify, matching the worked example) — never through `/auth/signup` or `/auth/login`.
- **`apple_sso`/`google_sso`** are find-or-create on *both* `/auth/signup` and `/auth/login` (they're aliases for the same underlying flow) — a mobile SSO button can't know in advance whether the account already exists, so both endpoints must behave the same way for these methods.
- **`email_password`** (HCP only) is the one method with genuine signup-vs-login semantics: `/auth/signup` fails (409) if the email already exists, `/auth/login` fails if it doesn't.
- Initial `User.roles[]` at signup: for `patient`/`family`/`caregiver` app_context, the role is set immediately (`roles = [app_context]`) since they map 1:1. For `hcp` app_context, `roles` stays empty at signup — actual clinical role (clinician/nurse/coordinator/admin) is assigned via org provisioning (C17b), a Faz 5 concern with no Faz 0 endpoint.

---

## D7 — RLS bypassed by table ownership; added a non-owner `sinalytix_app` role (bug found by the RLS-leak test itself)

**Found while running the Faz 0 RLS cross-org leak test:** it failed — every row was visible with zero session vars set. Root cause: Postgres RLS policies do not apply to a table's **owner** (or superuser) unless the table is explicitly `FORCE ROW LEVEL SECURITY`. Migrations run as `sinalytix` (docker-compose's owner role), so `core-api` connecting as that same role made every policy in the repo silently inert regardless of how carefully written.

**Fix:** `packages/db/migrations/0007_app-role.js` creates a non-owner `sinalytix_app` role with `SELECT/INSERT/UPDATE/DELETE` + `EXECUTE` grants (plus `ALTER DEFAULT PRIVILEGES` so future migrations' tables/functions are covered automatically, no repeated grants per migration). `services/core-api`'s `DbModule` now connects via a new `APP_DATABASE_URL` env var (this role), while `DATABASE_URL` (owner) is reserved for migrations only. Test setup (`test/setup.ts`) exposes both: `ownerDb` for fixture setup/teardown, `appDb` for anything asserting RLS behavior. This isn't a workaround — it's what Module 3 §1.3 already specifies ("api-monolith DB'ye uygulama rolüyle bağlanır... RLS'siz erişim yalnız migration") — the bug was that nothing had made that requirement literally true yet.

**Second-order bug this surfaced:** Postgres re-checks a table's **SELECT** policy for any `RETURNING` clause after an `INSERT` — not just the INSERT policy's `WITH CHECK`. The `users` bootstrap-insert policy (`app_acting_user_id() IS NULL OR user_id = ...`) correctly allows the INSERT itself pre-auth, but `INSERT ... RETURNING user_id` was still rejected, because by the time the RETURNING clause is checked against `users_self_select`, `acting_user_id` still isn't set to match. **Fix applied everywhere a new `User` row is created** (signup, SSO find-or-create, OTP find-or-create, and the equivalent test helper `createUser()` in `test/setup.ts`): generate `user_id` client-side (`randomUUID()`) and `setRlsVar(trx, 'app.acting_user_id', newUserId)` *before* the INSERT, not after. Any future phase creating a new row under a bootstrap-style policy (i.e., a policy with an `IS NULL` escape hatch) and immediately reading it back via `RETURNING` needs the same ordering — this is not specific to `users`, it's a general Postgres RLS + RETURNING interaction worth remembering.

---

## D8 — Bugs surfaced by updating the branch against `main` (PR #1 review pass)

`faz-0-core-schema-identity` was branched before PR #2/#3/#4 landed on `main` (pnpm version-conflict fix, 318 legacy ruff errors, missing ESLint flat configs for the 3 apps). Merging `main` in to pick up those fixes surfaced three genuine gaps in Faz 0's own work that had never actually been exercised, because CI always died earlier (at the pnpm version-conflict step) before reaching them:

1. **`lint-and-test-backend-ts` CI job had its own `version: 10` pin.** PR #4 removed the hardcoded `pnpm/action-setup@v4` version from the *existing* frontend job, but the TS backend job didn't exist on `main` yet at that point, so nobody could have fixed it there — Faz 0 introduced this job with the same mistake copy-pasted in. Removed the pin (relies on `packageManager` in `package.json`, same as the frontend job).
2. **`packages/domain`, `packages/db`, `packages/policy-engine`, `packages/audit`, `services/core-api` all had a `"lint": "eslint src/"` script with no `eslint`/`typescript-eslint` devDependency and no `eslint.config.js`.** Invisible before because the TS backend CI job never actually runs `lint` (only `check:rls`, `build`, `type-check`, `test`) — the repo-wide `pnpm turbo run lint type-check` (what the *frontend* job runs, unscoped across the whole workspace) is what catches it, and that job was also dying at the pnpm-conflict step before Faz 0 merged. Added `eslint.config.js` to all 5 (same `tseslint.config(tseslint.configs.recommended, {ignores: ['dist/*']})` pattern PR #3 used for `packages/shared`/`packages/ui`) plus the two devDependencies.
3. **Duplicate `vite` instances at different `@types/node` versions broke `services/core-api`'s own `type-check`.** `packages/db` and `packages/policy-engine` use `vitest` without pinning `@types/node`, so pnpm could resolve their `vite`/`vitest` against a different `@types/node` than `services/core-api` (which pins `^22.10.2` directly) — `vitest.config.ts`'s `plugins: [swc.vite()]` (from `unplugin-swc`) then ends up structurally typed against a *different* `vite` copy than `vitest/config`'s own `defineConfig`, and TypeScript rejects the assignment (`Plugin<any>` not assignable to `PluginOption`) because the two `vite` copies are nominally distinct despite being the same version. This is resolution-order-dependent, not deterministic — confirmed the pristine pre-merge commit's own lockfile already had both `@types/node@22.20.0` and `@types/node@25.6.0` present, dormant. Fixed with a root-level `pnpm.overrides["@types/node"] = "^22.10.2"`, forcing one resolved instance workspace-wide, rather than relying on install-order luck.

None of these three are `main`'s fault (confirmed by testing `main`'s own tree directly: only its pre-existing `packages/ui` missing-`tsconfig.json` gap reproduces there, unrelated to any of this). All three are latent Faz 0 gaps that a green CI run would have caught immediately — the pnpm version conflict was hiding them. Also resolved: a real (not auto-mergeable) conflict in root `package.json`'s `pnpm.overrides.onlyBuiltDependencies` between the two branches — combined both lists (`["argon2", "@nestjs/core", "@swc/core", "unrs-resolver"]`) rather than picking one side.

After these fixes, the TS backend CI job verified fully green locally against the actual commands each workflow step runs: `check:rls` → build 4 packages → type-check 5 packages → `cd services/core-api && pnpm test`, 9/9 passing against real Postgres/Redis. The other two jobs still showed two more failures at this point, both confirmed independently reproducible on plain `main` (unrelated to Faz 0) — `pnpm turbo run lint type-check` failing on `packages/ui`'s missing `tsconfig.json`, and `uv run pytest` exiting **5** ("no tests collected", a real non-zero exit code, not a pass) because `services/api/tests/` has no actual test files. Per the user's call, both were fixed in a separate PR rather than bundled here — see below.

---

## Pre-existing issues found while verifying PR #1's CI, fixed in a separate PR (#5)

Both confirmed independently reproducible on plain `main` before any fix — neither is Faz-0's fault, both predate this rewrite entirely:

1. **`packages/ui` had no `tsconfig.json`**, so its `build`/`type-check` scripts (`tsc` / `tsc --noEmit`) just printed the CLI help text and exited 1 — broke `pnpm turbo run build`/`type-check` for anything depending on `@sinalytix/ui` (the 3 existing apps). Fixed by adding `packages/ui/tsconfig.json`, matching `packages/shared`'s convention plus `jsx: "react-native"` (declared peer dep).
2. **`services/api/tests/` only ever had `__init__.py`, no real test files**, so `uv run pytest` exits code **5** ("no tests collected") — a real failure code that the `Backend Lint & Test` CI job was treating as a hard failure on every single PR regardless of what changed. Fixed by tolerating exit 5 specifically in the workflow step (`.github/workflows/ci.yml`), while still propagating any other non-zero exit (verified: injecting a deliberately-failing test still fails the job).

Per the established review workflow, these went through their own branch → PR (#5) → independent-agent review (APPROVE, verified all claims by actually running the commands, including injecting and reverting a deliberate test failure and a deliberate type error) → merge into `main`, then `main` was re-synced into `faz-0-core-schema-identity` a second time (one expected, predicted conflict in `.github/workflows/ci.yml`, resolved by keeping both sides: PR #5's tolerant pytest step + this branch's renamed job title).

All three CI jobs are now fully green on PR #1, verified both in CI and by running every workflow step's exact command locally.
