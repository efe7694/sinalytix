import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export interface Conversation {
  conversation_id: string;
  patient_id: string;
  type: 'individual' | 'group';
  name: string;
  archived_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_actor_type: 'patient' | 'family' | 'caregiver';
  sender_actor_id: string;
  sender_name: string;
  content: string;
  source: 'manual' | 'agent';
  sent_at: string;
}

interface MessagingState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: Record<string, boolean>;
  error: string | null;
}

interface MessagingActions {
  loadConversations(): Promise<void>;
  loadMessages(conversationId: string): Promise<void>;
  sendMessage(conversationId: string, content: string): Promise<void>;
  markRead(conversationId: string): Promise<void>;
}

export const useMessagingStore = create<MessagingState & MessagingActions>((set, get) => ({
  conversations: [],
  messages: {},
  loadingConversations: false,
  loadingMessages: {},
  error: null,

  loadConversations: async () => {
    set({ loadingConversations: true, error: null });
    try {
      const conversations = await api.get<Conversation[]>('/api/v1/messaging/conversations');
      set({ conversations, loadingConversations: false });
    } catch (err) {
      set({
        loadingConversations: false,
        error: err instanceof ApiError ? err.message : 'Konuşmalar yüklenemedi.',
      });
    }
  },

  loadMessages: async (conversationId) => {
    set((s) => ({ loadingMessages: { ...s.loadingMessages, [conversationId]: true } }));
    try {
      const messages = await api.get<Message[]>(
        `/api/v1/messaging/conversations/${conversationId}/messages`,
      );
      set((s) => ({
        messages: { ...s.messages, [conversationId]: messages },
        loadingMessages: { ...s.loadingMessages, [conversationId]: false },
      }));
    } catch {
      set((s) => ({ loadingMessages: { ...s.loadingMessages, [conversationId]: false } }));
    }
  },

  sendMessage: async (conversationId, content) => {
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Message = {
      message_id: tempId,
      conversation_id: conversationId,
      sender_actor_type: 'patient',
      sender_actor_id: '',
      sender_name: 'Siz',
      content,
      source: 'manual',
      sent_at: now,
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), optimistic],
      },
      conversations: s.conversations.map((c) =>
        c.conversation_id === conversationId
          ? { ...c, last_message_preview: content, last_message_at: now }
          : c,
      ),
    }));

    try {
      const saved = await api.post<Message>(
        `/api/v1/messaging/conversations/${conversationId}/messages`,
        { content },
      );
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
            m.message_id === tempId ? saved : m,
          ),
        },
      }));
    } catch {
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).filter(
            (m) => m.message_id !== tempId,
          ),
        },
      }));
    }
  },

  markRead: async (conversationId) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c,
      ),
    }));
    try {
      await api.post<void>(`/api/v1/messaging/conversations/${conversationId}/read`, {});
    } catch {
      // non-critical
    }
  },
}));
