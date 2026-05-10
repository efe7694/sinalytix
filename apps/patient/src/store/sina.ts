import { api } from '@/lib/api';
import { create } from 'zustand';

export type JudgeCategory =
  | 'MEDICAL_ADVICE'
  | 'IRRELEVANT'
  | 'GENERAL_LIFE'
  | 'IN_SCOPE_ACTION';

export type ActionType =
  | 'TASK_COMPLETE'
  | 'TASK_COUNTER_INCREMENT'
  | 'MESSAGE_SEND'
  | 'CALL_TRIGGER_REGULAR'
  | 'CALL_TRIGGER_SOS'
  | 'SYMPTOM_REPORT_SEND';

export type RiskLevel = 'green' | 'yellow' | 'red';

export interface ProposedAction {
  action_id: string;
  session_id: string;
  action_type: ActionType;
  judge_category: JudgeCategory;
  risk_level: RiskLevel;
  is_explicit_emergency: boolean;
  summary: string;
  action_summary: string;
  auto_confirm_after_sec: number;
  payload: Record<string, unknown>;
  tts_text: string | null;
}

export interface SinaResponse {
  session_id: string;
  proposed_action: ProposedAction | null;
  clarification_questions: string[];
  blocked_message: string | null;
  general_life_response: string | null;
}

export interface ClarificationAnswers {
  q1_answer: string | null;
  q2_answer: string | null;
}

export interface EscalationStatus {
  escalation_id: string;
  family_round1_called: boolean;
  family_answered: boolean;
}

interface SinaState {
  activeSessionId: string | null;
}

interface SinaActions {
  createSession(triggerSource: 'ptt' | 'wakeword_in_app'): Promise<string>;
  submitAudio(sessionId: string, audioUri: string): Promise<SinaResponse>;
  executeAction(actionId: string, clarifications?: ClarificationAnswers): Promise<void>;
  cancelSession(sessionId: string, reason?: string): Promise<void>;
  triggerRedEscalation(sessionId: string): Promise<EscalationStatus>;
  pollEscalationStatus(sessionId: string): Promise<EscalationStatus>;
}

export const useSinaStore = create<SinaState & SinaActions>((set) => ({
  activeSessionId: null,

  createSession: async (triggerSource) => {
    const res = await api.post<{ session_id: string }>('/api/v1/sina/sessions', {
      trigger_source: triggerSource,
    });
    set({ activeSessionId: res.session_id });
    return res.session_id;
  },

  submitAudio: async (sessionId, audioUri) => {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);
    return api.upload<SinaResponse>(`/api/v1/sina/sessions/${sessionId}/audio`, formData);
  },

  executeAction: async (actionId, clarifications) => {
    await api.post(`/api/v1/sina/actions/${actionId}/execute`, {
      clarifications: clarifications ?? null,
    });
  },

  cancelSession: async (sessionId, reason) => {
    await api.post(`/api/v1/sina/sessions/${sessionId}/cancel`, {
      reason: reason ?? null,
    });
    set({ activeSessionId: null });
  },

  triggerRedEscalation: async (sessionId) => {
    return api.post<EscalationStatus>(`/api/v1/sina/sessions/${sessionId}/red-escalate`, {});
  },

  pollEscalationStatus: async (sessionId) => {
    return api.get<EscalationStatus>(`/api/v1/sina/sessions/${sessionId}/escalation-status`);
  },
}));
