import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMessagingStore, Message } from '@/store/messaging';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message }: { message: Message }) {
  const isPatient = message.sender_actor_type === 'patient';
  const isTemp = message.message_id.startsWith('temp_');

  return (
    <View style={[styles.bubbleWrapper, isPatient ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isPatient && (
        <Text style={styles.senderName}>{message.sender_name}</Text>
      )}
      <View style={[styles.bubble, isPatient ? styles.bubblePatient : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isPatient && styles.bubbleTextPatient]}>
          {message.content}
        </Text>
      </View>
      <View style={[styles.bubbleMeta, isPatient ? styles.bubbleMetaRight : styles.bubbleMetaLeft]}>
        <Text style={styles.bubbleTime}>{formatTime(message.sent_at)}</Text>
        {message.source === 'agent' && (
          <View style={styles.agentTag}>
            <Ionicons name="sparkles" size={10} color={COLORS.primary} />
            <Text style={styles.agentLabel}>Sina ile gönderildi</Text>
          </View>
        )}
        {isTemp && (
          <ActivityIndicator size={10} color={COLORS.textDisabled} style={styles.sendingIndicator} />
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

  const { conversations, messages, loadingMessages, loadMessages, sendMessage, markRead } =
    useMessagingStore();

  const conversation = conversations.find((c) => c.conversation_id === id);
  const threadMessages = messages[id] ?? [];
  const isLoading = loadingMessages[id] ?? false;
  const isArchived = !!conversation?.archived_at;

  useEffect(() => {
    if (id) {
      loadMessages(id);
      markRead(id);
    }
  }, [id]);

  useEffect(() => {
    if (threadMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [threadMessages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || isArchived) return;

    setText('');
    setSending(true);
    try {
      await sendMessage(id, trimmed);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.name ?? ''}
          </Text>
          {isArchived && (
            <Text style={styles.archivedLabel}>Arşivlendi</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {isLoading && threadMessages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : threadMessages.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubble-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>Henüz mesaj yok. İlk mesajı gönder.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={threadMessages}
            keyExtractor={(m) => m.message_id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        {isArchived ? (
          <View style={styles.archivedBar}>
            <Ionicons name="archive-outline" size={16} color={COLORS.textDisabled} />
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
              placeholderTextColor={COLORS.textDisabled}
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
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  backBtn: {
    width: TOUCH_TARGET.PREFERRED,
    height: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1, marginRight: SPACING.MD },
  headerTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  archivedLabel: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    marginTop: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
    gap: SPACING.MD,
  },
  emptyText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  messageList: {
    padding: SPACING.MD,
    gap: SPACING.SM,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  bubbleWrapper: {
    maxWidth: '78%',
    gap: 3,
  },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },

  senderName: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 1,
    marginLeft: SPACING.SM,
  },

  bubble: {
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  bubblePatient: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: BORDER_RADIUS.SM,
  },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  bubbleTextPatient: { color: '#FFF' },

  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    flexWrap: 'wrap',
  },
  bubbleMetaLeft: { marginLeft: SPACING.SM },
  bubbleMetaRight: { justifyContent: 'flex-end' },

  bubbleTime: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  agentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surfaceSelected,
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  agentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sendingIndicator: { marginLeft: 2 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.SM,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.SM,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    maxHeight: 120,
    minHeight: TOUCH_TARGET.PREFERRED,
  },
  sendBtn: {
    width: TOUCH_TARGET.PREFERRED,
    height: TOUCH_TARGET.PREFERRED,
    borderRadius: TOUCH_TARGET.PREFERRED / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },

  archivedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  archivedBarText: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    textAlign: 'center',
  },
});
