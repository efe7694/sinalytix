/**
 * Task store — today's occurrences, optimistic updates, 5s undo window.
 *
 * Undo timer yönetimi:
 *   completeTask() çağrıldığında pendingUndo[id] = true set edilir.
 *   5 saniye sonra otomatik olarak temizlenir.
 *   undoTask() çağrılırsa timer iptal edilir ve pendingUndo[id] silinir.
 */

import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export interface Task {
  occurrence_id: string;
  task_id: string;
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype: 'standard' | 'medication';
  status: 'todo' | 'done' | 'skipped';
  progress_count: number | null;
  target_per_day: number | null;
  created_by_actor_type: 'patient' | 'caregiver' | 'family' | string;
  completed_at: string | null;
  skipped_at: string | null;
}

export interface CreateTaskInput {
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype?: 'standard' | 'medication';
  target_per_day?: number;
  due_date_local?: string;
  frequency?: 'daily' | 'weekly';
  days_of_week?: string[];
}

interface OccurrenceUpdate {
  status: Task['status'];
  progress_count: number | null;
  completed_at: string | null;
  skipped_at: string | null;
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

// Module-level timer map — outside Zustand to avoid serialization issues
const undoTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  tasks: [],
  pendingUndo: {},
  loading: false,
  error: null,

  loadToday: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await api.get<Task[]>('/api/v1/tasks/today');
      set({ tasks, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : 'Görevler yüklenemedi.' });
    }
  },

  completeTask: async (occurrenceId) => {
    // Optimistic update
    _updateOccurrence(set, get, occurrenceId, {
      status: 'done',
      progress_count: null,
      completed_at: new Date().toISOString(),
      skipped_at: null,
    });

    // Start 5s undo window
    set((s) => ({ pendingUndo: { ...s.pendingUndo, [occurrenceId]: true } }));
    const timer = setTimeout(() => {
      undoTimers.delete(occurrenceId);
      set((s) => {
        const next = { ...s.pendingUndo };
        delete next[occurrenceId];
        return { pendingUndo: next };
      });
    }, 5000);
    undoTimers.set(occurrenceId, timer);

    try {
      await api.post(`/api/v1/tasks/occurrences/${occurrenceId}/complete`, {});
    } catch {
      // Rollback
      _updateOccurrence(set, get, occurrenceId, {
        status: 'todo',
        progress_count: null,
        completed_at: null,
        skipped_at: null,
      });
      clearTimeout(undoTimers.get(occurrenceId));
      undoTimers.delete(occurrenceId);
      set((s) => {
        const next = { ...s.pendingUndo };
        delete next[occurrenceId];
        return { pendingUndo: next };
      });
    }
  },

  undoTask: async (occurrenceId) => {
    // Cancel timer
    clearTimeout(undoTimers.get(occurrenceId));
    undoTimers.delete(occurrenceId);
    set((s) => {
      const next = { ...s.pendingUndo };
      delete next[occurrenceId];
      return { pendingUndo: next };
    });

    // Optimistic revert
    _updateOccurrence(set, get, occurrenceId, {
      status: 'todo',
      progress_count: null,
      completed_at: null,
      skipped_at: null,
    });

    try {
      await api.post(`/api/v1/tasks/occurrences/${occurrenceId}/undo`, {});
    } catch {
      // Rollback: re-mark as done
      _updateOccurrence(set, get, occurrenceId, {
        status: 'done',
        progress_count: null,
        completed_at: new Date().toISOString(),
        skipped_at: null,
      });
    }
  },

  skipTask: async (occurrenceId) => {
    _updateOccurrence(set, get, occurrenceId, {
      status: 'skipped',
      progress_count: null,
      completed_at: null,
      skipped_at: new Date().toISOString(),
    });

    try {
      await api.post(`/api/v1/tasks/occurrences/${occurrenceId}/skip`, {});
    } catch {
      _updateOccurrence(set, get, occurrenceId, {
        status: 'todo',
        progress_count: null,
        completed_at: null,
        skipped_at: null,
      });
    }
  },

  incrementCounter: async (occurrenceId) => {
    const task = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!task) return;

    const newCount = (task.progress_count ?? 0) + 1;
    const target = task.target_per_day;
    const isDone = target !== null && newCount >= target;

    _updateOccurrence(set, get, occurrenceId, {
      status: isDone ? 'done' : 'todo',
      progress_count: newCount,
      completed_at: isDone ? new Date().toISOString() : null,
      skipped_at: null,
    });

    if (isDone) {
      // Start undo window same as completeTask
      set((s) => ({ pendingUndo: { ...s.pendingUndo, [occurrenceId]: true } }));
      const timer = setTimeout(() => {
        undoTimers.delete(occurrenceId);
        set((s) => {
          const next = { ...s.pendingUndo };
          delete next[occurrenceId];
          return { pendingUndo: next };
        });
      }, 5000);
      undoTimers.set(occurrenceId, timer);
    }

    try {
      await api.post(`/api/v1/tasks/occurrences/${occurrenceId}/increment`, {});
    } catch {
      // Rollback
      _updateOccurrence(set, get, occurrenceId, {
        status: task.status,
        progress_count: task.progress_count,
        completed_at: task.completed_at,
        skipped_at: task.skipped_at,
      });
    }
  },

  createTask: async (data) => {
    const newTask = await api.post<Task>('/api/v1/tasks', data);
    if (newTask.occurrence_id) {
      set((s) => ({ tasks: [...s.tasks, newTask] }));
    }
  },
}));

function _updateOccurrence(
  set: (fn: (s: TaskState) => Partial<TaskState>) => void,
  get: () => TaskState & TaskActions,
  occurrenceId: string,
  patch: OccurrenceUpdate,
) {
  set(() => ({
    tasks: get().tasks.map((t) =>
      t.occurrence_id === occurrenceId ? { ...t, ...patch } : t,
    ),
  }));
}
