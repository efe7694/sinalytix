/**
 * CareTask + CareTaskOccurrence wire contracts — Sözlük §3, Modül 2 §3.3,
 * Hasta PRD §4. Faz 2 Slice 1.
 *
 * The schedule is the interesting part: it is one jsonb column whose shape
 * depends on the task's `type`, so it is validated here as a discriminated
 * union rather than by a DB CHECK. SQL expresses that badly, and the API has
 * to reject a malformed schedule with a field-level 422 anyway.
 */

import { z } from 'zod';

// ── Enums (Sözlük §3) ───────────────────────────────────────────────────

export const CareTaskType = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  COUNTER: 'counter',
} as const;
export type CareTaskType = (typeof CareTaskType)[keyof typeof CareTaskType];

export const CareTaskSubtype = {
  STANDARD: 'standard',
  /** Medication tasks carry extra obligations: `If-Match` is MANDATORY on
   * edit (Modül 2 §3.3), and the family view hides the dose (Modül 2 §5.1). */
  MEDICATION: 'medication',
} as const;
export type CareTaskSubtype = (typeof CareTaskSubtype)[keyof typeof CareTaskSubtype];

export const CareTaskStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type CareTaskStatus = (typeof CareTaskStatus)[keyof typeof CareTaskStatus];

export const OccurrenceStatus = {
  TODO: 'todo',
  DONE: 'done',
  SKIPPED: 'skipped',
} as const;
export type OccurrenceStatus = (typeof OccurrenceStatus)[keyof typeof OccurrenceStatus];

/** Who may be recorded as having completed an occurrence. **`family` is
 * absent by design (B1)** — the canonical dictionary spells it out: "NOT
 * `family`". Enforced in PolicyEngine, the service, and the DB CHECK. */
export const CompletionActorType = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  SYSTEM: 'system',
  AGENT: 'agent',
} as const;
export type CompletionActorType = (typeof CompletionActorType)[keyof typeof CompletionActorType];

export const CreatorActorType = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  /** Family CAN create (B1 restricts completion, not creation — Modül 2 §3.3
   * is explicit: "aile **oluşturabilir**"). */
  FAMILY: 'family',
  CLINICIAN: 'clinician',
  SYSTEM: 'system',
  AGENT: 'agent',
} as const;
export type CreatorActorType = (typeof CreatorActorType)[keyof typeof CreatorActorType];

// ── Schedule ────────────────────────────────────────────────────────────

/** `MON`..`SUN`. Matches the legacy engine's stored format exactly
 * (`calendar.day_abbr[...].upper()`, LEGACY_HARVEST Faz 2) so existing rows
 * and any harvested logic agree on the string. */
export const DayOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type DayOfWeek = (typeof DayOfWeek)[number];

const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');

export const OneTimeScheduleSchema = z
  .object({
    due_date_local: LocalDateSchema,
    due_time_local: LocalTimeSchema.optional(),
  })
  .strict();

export const RecurringScheduleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly']),
    days_of_week: z.array(z.enum(DayOfWeek)).min(1).optional(),
    time_of_day_local: LocalTimeSchema.optional(),
  })
  .strict()
  // A weekly task with no days would generate nothing, forever, silently —
  // the kind of empty-list bug that looks like "the app forgot my task".
  .refine((s) => s.frequency !== 'weekly' || (s.days_of_week?.length ?? 0) > 0, {
    message: 'weekly frequency requires days_of_week',
    path: ['days_of_week'],
  });

export const CounterScheduleSchema = z
  .object({
    target_per_day: z.number().int().positive(),
    reset_rule: z.literal('daily').default('daily'),
    time_of_day_local: LocalTimeSchema.optional(),
  })
  .strict();

export type OneTimeSchedule = z.infer<typeof OneTimeScheduleSchema>;
export type RecurringSchedule = z.infer<typeof RecurringScheduleSchema>;
export type CounterSchedule = z.infer<typeof CounterScheduleSchema>;
export type CareTaskSchedule = OneTimeSchedule | RecurringSchedule | CounterSchedule;

/** Picks the schedule schema that matches `type`. Exported because the
 * occurrence generator validates a STORED schedule with it too — a row
 * written before a schema change must fail loudly in one place, not produce
 * silently wrong occurrences. */
export function scheduleSchemaFor(type: CareTaskType): z.ZodTypeAny {
  switch (type) {
    case CareTaskType.ONE_TIME:
      return OneTimeScheduleSchema;
    case CareTaskType.RECURRING:
      return RecurringScheduleSchema;
    case CareTaskType.COUNTER:
      return CounterScheduleSchema;
  }
}

// ── Requests ────────────────────────────────────────────────────────────

const CareTaskBodyBase = {
  title: z.string().trim().min(1).max(200),
  subtype: z.nativeEnum(CareTaskSubtype).default(CareTaskSubtype.STANDARD),
};

/** `type` + `schedule` are validated together, so `{type:'counter'}` with a
 * one-time schedule is a 422 rather than a task that never generates. */
export const CreateCareTaskRequestSchema = z.discriminatedUnion('type', [
  z.object({ ...CareTaskBodyBase, type: z.literal(CareTaskType.ONE_TIME), schedule: OneTimeScheduleSchema }),
  z.object({ ...CareTaskBodyBase, type: z.literal(CareTaskType.RECURRING), schedule: RecurringScheduleSchema }),
  z.object({ ...CareTaskBodyBase, type: z.literal(CareTaskType.COUNTER), schedule: CounterScheduleSchema }),
]);
export type CreateCareTaskRequest = z.infer<typeof CreateCareTaskRequestSchema>;

/** Edits. `type` is NOT editable: changing a counter into a one-time would
 * orphan the progress semantics of every occurrence already generated.
 * Delete and recreate instead. */
export const UpdateCareTaskRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    subtype: z.nativeEnum(CareTaskSubtype).optional(),
    schedule: z.record(z.unknown()).optional(),
    status: z.enum([CareTaskStatus.ACTIVE, CareTaskStatus.PAUSED, CareTaskStatus.CANCELLED]).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: 'at least one field is required' });
export type UpdateCareTaskRequest = z.infer<typeof UpdateCareTaskRequestSchema>;

export const CompleteOccurrenceRequestSchema = z
  .object({
    /** Counter tasks only: how much to add. Omitted = +1, which is what the
     * "one more" button sends. */
    counter_value: z.number().int().positive().optional(),
  })
  .strict();
export type CompleteOccurrenceRequest = z.infer<typeof CompleteOccurrenceRequestSchema>;

// ── Responses ───────────────────────────────────────────────────────────

export const CareTaskPublicSchema = z.object({
  task_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  parent_task_id: z.string().uuid().nullable(),
  title: z.string(),
  type: z.nativeEnum(CareTaskType),
  subtype: z.nativeEnum(CareTaskSubtype),
  schedule: z.record(z.unknown()),
  status: z.nativeEnum(CareTaskStatus),
  created_by: z.string().uuid(),
  created_by_actor_type: z.nativeEnum(CreatorActorType),
  source_provenance: z.string(),
  /** Optimistic-lock token — send it back as `If-Match` when editing
   * (mandatory for the medication subtype, Modül 2 §3.3). */
  version: z.number().int(),
  created_at: z.string().datetime(),
});
export type CareTaskPublic = z.infer<typeof CareTaskPublicSchema>;

export const CareTaskOccurrencePublicSchema = z.object({
  occurrence_id: z.string().uuid(),
  task_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  date_local: z.string(),
  time_local: z.string().nullable(),
  status: z.nativeEnum(OccurrenceStatus),
  progress_count: z.number().int().nullable(),
  /** Counter target, denormalized from the task so the "3 / 8" label needs no
   * second lookup. */
  target_per_day: z.number().int().nullable(),
  completed_at: z.string().datetime().nullable(),
  completed_by: z.string().uuid().nullable(),
  completed_by_actor_type: z.nativeEnum(CompletionActorType).nullable(),
  carry_over_from: z.string().uuid().nullable(),
  // Denormalized task fields — the "today" list renders from occurrences
  // alone, and this is the hottest read in the product (Modül 2 §3.3: the
  // single source for all four apps' "today" view).
  title: z.string(),
  type: z.nativeEnum(CareTaskType),
  subtype: z.nativeEnum(CareTaskSubtype),
  task_status: z.nativeEnum(CareTaskStatus),
  /** Who added this task. The Hasta PRD requires the list to label it ("Sen
   * ekledin" / "Bakıcı ekledin"), so it travels with the occurrence rather
   * than forcing the client to fetch the task too. */
  created_by_actor_type: z.nativeEnum(CreatorActorType),
});
export type CareTaskOccurrencePublic = z.infer<typeof CareTaskOccurrencePublicSchema>;

/**
 * B1's machine-readable marker. Modül 2 §3.3 names this exact rule id in the
 * 403 body (`details.rule: "B1_family_cannot_complete"`) so a client can tell
 * "you specifically may not complete" from a generic permission failure and
 * render the right explanation.
 */
export const B1_RULE_ID = 'B1_family_cannot_complete';
