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
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { usePatientsStore } from '@/store/patients';
import { useShiftsStore } from '@/store/shifts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '📋 Vardiya özeti', text: 'Bu hasta için vardiya özetini çıkar.' },
  { label: '💊 Bakım planı', text: 'Hastanın güncel bakım planını özetle.' },
  { label: '⚠️ Dikkat edilecekler', text: 'Bu hastada dikkat etmem gereken kritik noktalar neler?' },
  { label: '📌 Görev öncelikleri', text: 'Bugün hangi görevlere öncelik vermeliyim?' },
];

export default function SinaScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const { selectedPatientId, patients } = usePatientsStore();
  const { activeShift } = useShiftsStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const patient = patients.find((p) => p.patient_id === selectedPatientId);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: patient
          ? `Merhaba! Ben Sina. ${patient.display_name} hakkında soru sorabilir, bakım planını öğrenebilir veya vardiya notları oluşturabilirim.`
          : 'Merhaba! Ben Sina. Bakım planı sorularınızda yardımcı olabilirim.',
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  async function handleSend(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setInput('');
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/ai/caregiver/chat', {
        message: trimmed,
        patient_id: selectedPatientId ?? null,
        shift_id: activeShift?.shift_id ?? null,
        interaction_type: 'care_plan_qa',
      });

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        content: 'Şu an yanıt veremiyorum. Lütfen tekrar dene.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>✦ Sina</Text>
          <Text style={styles.headerSub}>Bakıcı AI Asistanı</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleWrapper,
                item.role === 'user' ? styles.bubbleRight : styles.bubbleLeft,
              ]}
            >
              {item.role === 'assistant' && (
                <View style={styles.sinaAvatar}>
                  <Text style={styles.sinaAvatarText}>✦</Text>
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === 'user' && styles.bubbleTextUser,
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    item.role === 'user' && styles.bubbleTimeUser,
                  ]}
                >
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View style={styles.thinkingRow}>
                <View style={styles.sinaAvatar}>
                  <Text style={styles.sinaAvatarText}>✦</Text>
                </View>
                <View style={styles.thinkingBubble}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.thinkingText}>Düşünüyor...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Hızlı promptlar — sadece ilk mesajdan sonra göster */}
        {messages.length <= 1 && !loading && (
          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map((qp) => (
              <TouchableOpacity
                key={qp.label}
                style={styles.quickBtn}
                onPress={() => handleSend(qp.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickLabel}>{qp.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Sina klinik karar vermez. Bilgiler yalnızca bakım planından türetilir.
        </Text>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Soru sor..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  back: { fontSize: 16, color: '#059669', fontWeight: '500', width: 48 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#059669' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  messageList: { padding: 16, gap: 12, flexGrow: 1 },

  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleLeft: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubbleRight: { alignSelf: 'flex-end', maxWidth: '80%', flexDirection: 'row-reverse' },

  sinaAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sinaAvatarText: { fontSize: 12, color: '#059669' },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { fontSize: 11, color: '#9CA3AF', alignSelf: 'flex-end' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.65)' },

  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thinkingText: { fontSize: 13, color: '#9CA3AF' },

  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  quickBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickLabel: { fontSize: 13, fontWeight: '500', color: '#059669' },

  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 6,
  },

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
});
