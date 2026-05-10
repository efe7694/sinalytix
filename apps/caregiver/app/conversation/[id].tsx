import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';

interface Message {
  message_id: string;
  conversation_id: string;
  sender_actor_type: 'caregiver' | 'patient' | 'family' | 'agent' | 'system';
  sender_name: string;
  content: string;
  source: 'human' | 'agent';
  sent_at: string;
  read_at: string | null;
}

interface ConversationDetail {
  conversation_id: string;
  type: 'direct' | 'group' | 'broadcast' | 'system_event';
  title: string;
  archived_at: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message }: { message: Message }) {
  const isMe = message.sender_actor_type === 'caregiver';
  const isTemp = message.message_id.startsWith('temp_');

  return (
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isMe && (
        <Text style={styles.senderName}>{message.sender_name}</Text>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {message.content}
        </Text>
      </View>
      <View style={[styles.bubbleMeta, isMe ? styles.bubbleMetaRight : styles.bubbleMetaLeft]}>
        <Text style={styles.bubbleTime}>{formatTime(message.sent_at)}</Text>
        {message.source === 'agent' && (
          <View style={styles.agentTag}>
            <Text style={styles.agentLabel}>✦ Sina</Text>
          </View>
        )}
        {isTemp && (
          <ActivityIndicator size={10} color="#9CA3AF" style={styles.sendingIndicator} />
        )}
        {isMe && !isTemp && message.read_at && (
          <Text style={styles.readReceipt}>✓✓</Text>
        )}
        {isMe && !isTemp && !message.read_at && (
          <Text style={styles.readReceipt}>✓</Text>
        )}
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<Message>>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const isArchived = !!conversation?.archived_at;

  useEffect(() => {
    if (!id) return;
    loadConversation();
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  async function loadConversation() {
    try {
      const [conv, msgs] = await Promise.all([
        api.get<ConversationDetail>(`/messaging/conversations/${id}`),
        api.get<Message[]>(`/messaging/conversations/${id}/messages`),
      ]);
      setConversation(conv);
      setMessages(msgs);
      markRead();
    } catch {
      // fail silently — network error
    } finally {
      setLoading(false);
    }
  }

  async function markRead() {
    try {
      await api.post(`/messaging/conversations/${id}/read`, {});
    } catch {
      // best-effort
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || isArchived) return;

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      message_id: tempId,
      conversation_id: id,
      sender_actor_type: 'caregiver',
      sender_name: 'Ben',
      content: trimmed,
      source: 'human',
      sent_at: new Date().toISOString(),
      read_at: null,
    };

    setText('');
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const sent = await api.post<Message>(`/messaging/conversations/${id}/messages`, {
        content: trimmed,
      });
      setMessages((prev) => prev.map((m) => (m.message_id === tempId ? sent : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.title ?? ''}
          </Text>
          {isArchived && <Text style={styles.archivedLabel}>Arşivlendi</Text>}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#059669" size="large" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Henüz mesaj yok. İlk mesajı gönder.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.message_id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {isArchived ? (
          <View style={styles.archivedBar}>
            <Text style={styles.archivedBarText}>
              Bu konuşma arşivlendi. Yeni mesaj gönderilemez.
            </Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Mesaj yaz..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.8}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    minHeight: 56,
    gap: 8,
  },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 16, color: '#059669', fontWeight: '500' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  archivedLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },

  messageList: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  bubbleWrapper: { maxWidth: '78%', gap: 3 },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },

  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
    marginLeft: 12,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },

  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  bubbleMetaLeft: { marginLeft: 12 },
  bubbleMetaRight: { justifyContent: 'flex-end' },

  bubbleTime: { fontSize: 11, color: '#9CA3AF' },
  agentTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  agentLabel: { fontSize: 10, fontWeight: '600', color: '#059669' },
  sendingIndicator: { marginLeft: 2 },
  readReceipt: { fontSize: 11, color: '#9CA3AF' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#D1FAE5' },
  sendIcon: { fontSize: 20, color: '#fff', fontWeight: '700' },

  archivedBar: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  archivedBarText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
