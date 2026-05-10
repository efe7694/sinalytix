import { create } from 'zustand';
import { api } from '@/lib/api';

export type TaskType = 'one_time' | 'recurring' | 'counter';
export type TaskSubtype = 'standard' | 'medication';
export type TaskStatus = 'todo' | 'done' | 'skipped';

// Aligned to backend TodayTaskOut schema
export interface TaskOccurrence {
  occurrence_id: string;
  task_id: string;
  patient_id: string;
  title: string;
  type: TaskType;
  subtype: TaskSubtype;
  date_local: string;
  time_of_day_local: string | null;
  status: TaskStatus;
  completed_at: string | null;
  skipped_at: string | null;
  progress_count: number | null;
  target_per_day: number | null;
  created_by_actor_type: string; // patient | caregiver | family
}

export interface AddTaskPayload {
  patient_id: string;
  title: string;
  type: TaskType;
  subtype: TaskSubtype;
  date_local?: string;
  time_of_day_local?: string | null;
  days_of_week?: number[];
  target_per_day?: number;
}

interface TasksState {
  tasks: TaskOccurrence[];
  isLoading: boolean;

  fetchTodayTasks: (patientId: string) => Promise<void>;
  addTask: (payload: AddTaskPayload) => Promise<void>;
  carryOverTask: (occurrenceId: string, targetDate: string) => Promise<void>;
  carryOverAll: (patientId: string, targetDate: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTodayTasks: async (patientId) => {
    set({ isLoading: true });
    try {
      const tasks = await api.get<TaskOccurrence[]>(
        `/family/patients/${patientId}/tasks/today`,
      );
      set({ tasks });
    } catch {
      // offline — keep cached
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (payload) => {
    const task = await api.post<TaskOccurrence>('/family/tasks', payload);
    set({ tasks: [...get().tasks, task] });
  },

  carryOverTask: async (occurrenceId, targetDate) => {
    await api.post(`/family/tasks/occurrences/${occurrenceId}/carry-over`, { target_date: targetDate });
    const tasks = get().tasks;
    if (tasks.length > 0) {
      await get().fetchTodayTasks(tasks[0].patient_id);
    }
  },

  carryOverAll: async (patientId, targetDate) => {
    await api.post(`/family/patients/${patientId}/tasks/carry-over-all`, { target_date: targetDate });
    await get().fetchTodayTasks(patientId);
  },
}));
