import { useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { usePatientsStore } from '@/store/patients';

const BRAND = '#6366F1';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  is_flagged?: boolean;
  flag_reason?: string | null;
}

const QUICK_PROMPTS = [
  'Bugün nasıl gitti?',
  'İlaçları aldı mı?',
  'Bakıcı ne zaman geldi?',
  'Son semptomlar neydi?',
];

export default function SinaScreen() {
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedPatientId || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setText('');
    setIsSending(true);

    try {
      // NOTE: this path doesn't match any registered backend route (the old
      // backend only has POST /family/sina/chat, no {patient_id} segment) —
      // it 404s today. Even if it were pointed at the right path, that
      // handler intentionally raises 501 Not Implemented (family AI chat is
      // Faz 6/AI scope in the new backend), so this call is expected to fail
      // either way — not an oversight, not worth patching in a retiring backend.
      const response = await api.post<{
        content: string;
        is_flagged: boolean;
        flag_reason: string | null;
      }>(`/family/patients/${selectedPatientId}/sina/chat`, {
        message: content.trim(),
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        is_flagged: response.is_flagged,
        flag_reason: response.flag_reason,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Bir hata oluştu. Lütfen tekrar deneyin.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>✨ Sina</Text>
          <Text style={styles.subtitle}>Bakım Asistanı</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Sina&apos;ya sor</Text>
            <Text style={styles.emptySubtitle}>
              Hastanın günlük bakım özeti, görev durumu, semptomlar ve bakıcı vardiyası hakkında sorular sorabilirsiniz.
            </Text>
            <View style={styles.quickPromptsGrid}>
              {QUICK_PROMPTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickPrompt}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={styles.quickPromptText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ⚠ Sina tıbbi tavsiye vermez. Acil durum için 911&apos;i arayın.
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <ChatBubble msg={item} />}
            ListFooterComponent={isSending ? <TypingIndicator /> : null}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Sina'ya sor..."
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(text)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(text)}
            disabled={!text.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>›</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>✨</Text>
        </View>
      )}
      <View style={styles.bubbleContainer}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.content}</Text>
        </View>
        {msg.is_flagged && (
          <Text style={styles.flaggedNote}>
            ⚠ Bu yanıt güvenlik filtresi tarafından incelendi.{msg.flag_reason ? ` (${msg.flag_reason})` : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>✨</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        <Text style={styles.typingDots}>• • •</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: BRAND, fontWeight: '300' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  quickPromptsGrid: { width: '100%', gap: 8, marginTop: 8 },
  quickPrompt: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickPromptText: { fontSize: 14, color: BRAND, fontWeight: '500', textAlign: 'center' },
  disclaimer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginTop: 8,
  },
  disclaimerText: { fontSize: 12, color: '#92400E', textAlign: 'center', lineHeight: 18 },

  messages: { paddingHorizontal: 12, paddingVertical: 16, gap: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14 },
  bubbleContainer: { maxWidth: '78%', gap: 4 },
  bubble: {
    borderRadius: 18,
    padding: 12,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  bubbleUser: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  flaggedNote: { fontSize: 11, color: '#D97706', fontStyle: 'italic', paddingHorizontal: 4 },
  typingBubble: { paddingVertical: 14 },
  typingDots: { fontSize: 18, color: '#9CA3AF', letterSpacing: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C7D2FE' },
  sendBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
