/**
 * Task store — today's occurrences.
 *
 * Rewired to core-api's CareTask engine (Faz 2 Slice 1). Two shape changes
 * worth knowing:
 *
 * 1. **The server is authoritative for the result of an action.** Every
 *    complete/skip/undo returns the updated occurrence, and we apply THAT
 *    rather than guessing. It matters most for counters: whether tapping
 *    "one more" crossed the target and auto-completed is the engine's call
 *    (it clamps at the target), not something the client should re-derive.
 *    We still update optimistically first so the tap feels instant, then
 *    reconcile with the server's row.
 *
 * 2. **Counter increments go through `/complete`.** The engine treats a
 *    counter tap as "complete, +1" and auto-finishes at `target_per_day` —
 *    there is no separate increment endpoint.
 *
 * Undo window: the UI shows 5s, the server allows 10s. That gap is
 * deliberate (LEGACY_HARVEST Faz 2) so a tap on the 5th second over a slow
 * connection still lands.
 */

import { coreApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { create } from 'zustand';

/** Mirrors `CareTaskOccurrencePublic` (@sinalytix/domain). */
export interface Task {
  occurrence_id: string;
  task_id: string;
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype: 'standard' | 'medication';
  status: 'todo' | 'done' | 'skipped';
  progress_count: number | null;
  target_per_day: number | null;
  completed_at: string | null;
  completed_by_actor_type: 'patient' | 'caregiver' | 'system' | 'agent' | null;
  created_by_actor_type: 'patient' | 'caregiver' | 'family' | 'clinician' | 'system' | 'agent';
  date_local: string;
  time_local: string | null;
  task_status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface CreateTaskInput {
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype?: 'standard' | 'medication';
  target_per_day?: number;
  due_date_local?: string;
  due_time_local?: string;
  frequency?: 'daily' | 'weekly';
  days_of_week?: string[];
  time_of_day_local?: string;
}

interface TaskState {
  tasks: Task[];
  pendingUndo: Record<string, boolean>;
  loading: boolean;
  error: string | null;
}

interface TaskActions {
  loadToday(): Promise<void>;
  completeTask(occurrenceId: string): Promise<void>;
  undoTask(occurrenceId: string): Promise<void>;
  skipTask(occurrenceId: string): Promise<void>;
  incrementCounter(occurrenceId: string): Promise<void>;
  createTask(data: CreateTaskInput): Promise<void>;
}

/** The UI's undo countdown. The server allows 10s — see the file header. */
const UI_UNDO_WINDOW_MS = 5000;

// Module-level timer map — outside Zustand to avoid serialization issues.
const undoTimers = new Map<string, ReturnType<typeof setTimeout>>();

function patientId(): string {
  const { userId } = useAuthStore.getState();
  if (!userId) throw new Error('patientId() called with no authenticated user');
  return userId;
}

/**
 * Translates the flat form input into the engine's discriminated schedule
 * (`@sinalytix/domain`). Done here rather than in the screen so the wire
 * shape lives in one place.
 */
function toSchedule(data: CreateTaskInput): Record<string, unknown> {
  switch (data.type) {
    case 'one_time':
      return {
        due_date_local: data.due_date_local,
        ...(data.due_time_local ? { due_time_local: data.due_time_local } : {}),
      };
    case 'counter':
      return {
        target_per_day: data.target_per_day ?? 1,
        reset_rule: 'daily',
        ...(data.time_of_day_local ? { time_of_day_local: data.time_of_day_local } : {}),
      };
    case 'recurring':
    default:
      return {
        frequency: data.frequency ?? 'daily',
        ...(data.frequency === 'weekly' ? { days_of_week: data.days_of_week ?? [] } : {}),
        ...(data.time_of_day_local ? { time_of_day_local: data.time_of_day_local } : {}),
      };
  }
}

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  tasks: [],
  pendingUndo: {},
  loading: false,
  error: null,

  loadToday: async () => {
    set({ loading: true, error: null });
    try {
      // No `date` param — the server resolves the PATIENT's today from their
      // own timezone, which is the only correct answer for a nightly dose.
      const tasks = await coreApi.get<Task[]>(`/patients/${patientId()}/occurrences`);
      set({ tasks, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : 'Görevler yüklenemedi.' });
    }
  },

  completeTask: async (occurrenceId) => {
    const previous = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!previous) return;

    _patch(set, get, occurrenceId, { status: 'done', completed_at: new Date().toISOString() });
    _startUndoWindow(set, occurrenceId);

    try {
      const updated = await coreApi.post<Task>(`/occurrences/${occurrenceId}/complete`, {});
      _replace(set, get, updated);
    } catch (err) {
      _rollback(set, get, previous);
      _clearUndoWindow(set, occurrenceId);
      _surface(set, err, 'Görev tamamlanamadı.');
    }
  },

  undoTask: async (occurrenceId) => {
    const previous = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!previous) return;

    _clearUndoWindow(set, occurrenceId);
    _patch(set, get, occurrenceId, { status: 'todo', completed_at: null, completed_by_actor_type: null });

    try {
      const updated = await coreApi.post<Task>(`/occurrences/${occurrenceId}/undo`, {});
      _replace(set, get, updated);
    } catch (err) {
      _rollback(set, get, previous);
      _surface(set, err, 'Geri alınamadı.');
    }
  },

  skipTask: async (occurrenceId) => {
    const previous = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!previous) return;

    _patch(set, get, occurrenceId, { status: 'skipped', completed_at: null });

    try {
      const updated = await coreApi.post<Task>(`/occurrences/${occurrenceId}/skip`, {});
      _replace(set, get, updated);
    } catch (err) {
      _rollback(set, get, previous);
      _surface(set, err, 'Görev atlanamadı.');
    }
  },

  incrementCounter: async (occurrenceId) => {
    const previous = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!previous) return;

    const optimisticCount = (previous.progress_count ?? 0) + 1;
    const target = previous.target_per_day;
    const optimisticallyDone = target !== null && optimisticCount >= target;
    _patch(set, get, occurrenceId, {
      progress_count: optimisticCount,
      status: optimisticallyDone ? 'done' : 'todo',
    });

    try {
      // The engine clamps at the target and decides whether this tap
      // auto-completed the task — its row wins over the optimistic guess.
      const updated = await coreApi.post<Task>(`/occurrences/${occurrenceId}/complete`, {});
      _replace(set, get, updated);
      if (updated.status === 'done') _startUndoWindow(set, occurrenceId);
    } catch (err) {
      _rollback(set, get, previous);
      _surface(set, err, 'Sayaç güncellenemedi.');
    }
  },

  createTask: async (data) => {
    const created = await coreApi.post<{ task_id: string }>(`/patients/${patientId()}/care-tasks`, {
      title: data.title,
      type: data.type,
      subtype: data.subtype ?? 'standard',
      schedule: toSchedule(data),
    });
    // The engine materializes today's occurrence as part of creation, but the
    // task response is the TASK, not an occurrence — so refetch rather than
    // splicing a half-shaped row into the list.
    if (created.task_id) await get().loadToday();
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────

function _patch(
  set: (fn: (s: TaskState) => Partial<TaskState>) => void,
  get: () => TaskState & TaskActions,
  occurrenceId: string,
  patch: Partial<Task>,
) {
  set(() => ({
    tasks: get().tasks.map((t) => (t.occurrence_id === occurrenceId ? { ...t, ...patch } : t)),
  }));
}

/** Applies the server's authoritative row. */
function _replace(
  set: (fn: (s: TaskState) => Partial<TaskState>) => void,
  get: () => TaskState & TaskActions,
  updated: Task,
) {
  set(() => ({
    tasks: get().tasks.map((t) => (t.occurrence_id === updated.occurrence_id ? { ...t, ...updated } : t)),
  }));
}

function _rollback(
  set: (fn: (s: TaskState) => Partial<TaskState>) => void,
  get: () => TaskState & TaskActions,
  previous: Task,
) {
  set(() => ({
    tasks: get().tasks.map((t) => (t.occurrence_id === previous.occurrence_id ? previous : t)),
  }));
}

/** A failed action must SAY so. Silently rolling back looks like the tap
 * never registered, and on a medication list that reads as "I already did
 * this" — the one misreading with a real cost. */
function _surface(set: (fn: (s: TaskState) => Partial<TaskState>) => void, err: unknown, fallback: string) {
  set(() => ({ error: err instanceof ApiError ? err.message : fallback }));
}

function _startUndoWindow(set: (fn: (s: TaskState) => Partial<TaskState>) => void, occurrenceId: string) {
  set((s) => ({ pendingUndo: { ...s.pendingUndo, [occurrenceId]: true } }));
  const timer = setTimeout(() => {
    undoTimers.delete(occurrenceId);
    set((s) => {
      const next = { ...s.pendingUndo };
      delete next[occurrenceId];
      return { pendingUndo: next };
    });
  }, UI_UNDO_WINDOW_MS);
  undoTimers.set(occurrenceId, timer);
}

function _clearUndoWindow(set: (fn: (s: TaskState) => Partial<TaskState>) => void, occurrenceId: string) {
  clearTimeout(undoTimers.get(occurrenceId));
  undoTimers.delete(occurrenceId);
  set((s) => {
    const next = { ...s.pendingUndo };
    delete next[occurrenceId];
    return { pendingUndo: next };
  });
}
