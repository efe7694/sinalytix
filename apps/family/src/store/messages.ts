import { create } from 'zustand';
import { api } from '@/lib/api';

// Aligned to backend ConversationOut + MessageOut schemas
export interface Conversation {
  conversation_id: string;
  type: 'individual' | 'group';
  patient_id: string;
  name: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  archived_at: string | null;
  // Computed helpers (derived from above fields)
  is_archived: boolean;
  is_group: boolean;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_actor_id: string;
  sender_actor_type: string; // patient | caregiver | family | agent
  sender_name: string;
  content: string;
  source: 'manual' | 'agent';
  sent_at: string;
  // Computed helper
  is_ai_generated: boolean;
}

interface MessagesState {
  conversations: Conversation[];
  activeMessages: Message[];
  isLoading: boolean;

  fetchConversations: (patientId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
}

function toConversation(raw: Omit<Conversation, 'is_archived' | 'is_group'>): Conversation {
  return {
    ...raw,
    is_archived: raw.archived_at !== null,
    is_group: raw.type === 'group',
  };
}

function toMessage(raw: Omit<Message, 'is_ai_generated'>): Message {
  return { ...raw, is_ai_generated: raw.source === 'agent' };
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  activeMessages: [],
  isLoading: false,

  fetchConversations: async (patientId) => {
    set({ isLoading: true });
    try {
      const raw = await api.get<Omit<Conversation, 'is_archived' | 'is_group'>[]>(
        `/family/patients/${patientId}/conversations`,
      );
      set({ conversations: raw.map(toConversation) });
    } catch {
      // offline
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true, activeMessages: [] });
    try {
      const raw = await api.get<Omit<Message, 'is_ai_generated'>[]>(
        `/family/conversations/${conversationId}/messages`,
      );
      set({ activeMessages: raw.map(toMessage) });
    } catch {
      // offline
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId, content) => {
    const raw = await api.post<Omit<Message, 'is_ai_generated'>>(
      `/family/conversations/${conversationId}/messages`,
      { content },
    );
    set({ activeMessages: [...get().activeMessages, toMessage(raw)] });
  },
}));
