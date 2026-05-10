import { useEffect, useRef, useState } from 'react';
import {
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
import { useMessagesStore, type Message } from '@/store/messages';
import { useAuthStore } from '@/store/auth';

const BRAND = '#6366F1';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { conversations, activeMessages, fetchMessages, sendMessage } = useMessagesStore();

  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const conv = conversations.find((c) => c.conversation_id === id);

  useEffect(() => {
    if (id) fetchMessages(id);
  }, [id]);

  const handleSend = async () => {
    if (!text.trim() || !id || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(id, text.trim());
      setText('');
      listRef.current?.scrollToEnd({ animated: true });
    } finally {
      setIsSending(false);
    }
  };

  const isArchived = conv?.is_archived ?? false;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{conv?.name ?? 'Konuşma'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={activeMessages}
          keyExtractor={(m) => m.message_id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isOwn={item.sender_actor_id === profile?.user_id} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Henüz mesaj yok. İlk mesajı siz gönderin.</Text>
          }
        />

        {isArchived ? (
          <View style={styles.archivedBar}>
            <Text style={styles.archivedText}>Bu kişiyle bağlantı kesildi. Mesaj gönderilemiyor.</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Mesaj yaz..."
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || isSending}
            >
              <Text style={styles.sendBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const time = new Date(msg.sent_at).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={styles.senderName}>{msg.sender_name}</Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.content}</Text>
        {msg.is_ai_generated && (
          <Text style={styles.aiLabel}>✨ Sina ile gönderildi</Text>
        )}
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{time}</Text>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: BRAND, fontWeight: '300' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  messages: { paddingHorizontal: 12, paddingVertical: 16, gap: 8 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 24 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  bubbleOwn: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 2 },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 21 },
  bubbleTextOwn: { color: '#fff' },
  aiLabel: { fontSize: 11, color: '#C7D2FE', fontStyle: 'italic' },
  bubbleTime: { fontSize: 11, color: '#9CA3AF', alignSelf: 'flex-end' },
  bubbleTimeOwn: { color: '#C7D2FE' },
  archivedBar: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  archivedText: { fontSize: 14, color: '#92400E', textAlign: 'center' },
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
