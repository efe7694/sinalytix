import { useEffect, useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { SOSBanner } from '@/components/SOSBanner';
import { usePatientsStore } from '@/store/patients';
import { useTasksStore } from '@/store/tasks';
import { useMessagesStore } from '@/store/messages';
import { api } from '@/lib/api';

const BRAND = '#6366F1';

interface CaregiverShift {
  shift_id: string;
  caregiver_name: string;
  status: 'active' | 'completed' | 'cancelled';
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
}

interface SymptomPreview {
  report_id: string;
  symptom_text: string;
  created_at: string;
  unread_count: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { patients, selectedPatientId, fetchPatients, fetchActiveSOS, activeSOS } = usePatientsStore();
  const { tasks, fetchTodayTasks } = useTasksStore();
  const { conversations, fetchConversations } = useMessagesStore();

  const [shift, setShift] = useState<CaregiverShift | null>(null);
  const [symptom, setSymptom] = useState<SymptomPreview | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId) ?? null;

  const loadData = async () => {
    if (!selectedPatientId) return;
    await Promise.all([
      fetchTodayTasks(selectedPatientId),
      fetchActiveSOS(selectedPatientId),
      fetchConversations(selectedPatientId),
      api.get<CaregiverShift | null>(`/family/patients/${selectedPatientId}/shift/active`)
        .then(setShift).catch(() => {}),
      api.get<SymptomPreview | null>(`/family/patients/${selectedPatientId}/symptoms/latest-unread`)
        .then(setSymptom).catch(() => {}),
    ]);
  };

  useEffect(() => { loadData(); }, [selectedPatientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPatients(), loadData()]);
    setRefreshing(false);
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const pendingCount = tasks.filter((t) => t.status === 'todo').length;
  const medicationPending = tasks.filter((t) => t.status === 'todo' && t.subtype === 'medication').length;

  const lastConversation = conversations.find((c) => !c.is_archived);
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      <SOSBanner />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!selectedPatient ? (
          <NoPatientState onConnect={() => router.push('/onboarding/connect')} />
        ) : (
          <>
            {/* Caregiver Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/shift-detail')}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Bakıcı</Text>
                {shift?.status === 'active' && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Aktif</Text>
                  </View>
                )}
              </View>
              {shift?.status === 'active' ? (
                <Text style={styles.cardBody}>
                  {shift.caregiver_name} — {new Date(shift.check_in_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibaren
                </Text>
              ) : shift?.status === 'completed' ? (
                <Text style={styles.cardBody}>
                  {shift.caregiver_name} vardiyayı tamamladı ({shift.duration_minutes} dk)
                </Text>
              ) : (
                <Text style={styles.cardBodyMuted}>Aktif bakıcı yok</Text>
              )}
            </TouchableOpacity>

            {/* Task Summary Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/(main)/tasks')}
              activeOpacity={0.8}
            >
              <Text style={styles.cardTitle}>Bugünün Görevleri</Text>
              <Text style={styles.cardBody}>
                {completedCount}/{tasks.length} tamamlandı · {pendingCount} bekliyor
              </Text>
              {medicationPending > 0 && (
                <View style={styles.medicationAlert}>
                  <Text style={styles.medicationAlertText}>
                    ⚠ {medicationPending} ilaç görevi bekliyor
                  </Text>
                </View>
              )}
              {tasks.length === 0 && (
                <Text style={styles.cardBodyMuted}>Bugün planlanmış görev yok</Text>
              )}
            </TouchableOpacity>

            {/* Symptom Card — only if unread */}
            {symptom && (
              <TouchableOpacity
                style={[styles.card, styles.cardWarning]}
                onPress={() => router.push(`/symptoms/${symptom.report_id}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardTitle}>Semptom Bildirimi</Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {symptom.symptom_text}
                </Text>
                <Text style={styles.disclaimer}>
                  ⚠ Bu bildirim acil durum değerlendirmesi içermez.
                </Text>
              </TouchableOpacity>
            )}

            {/* Last Message Card */}
            {lastConversation && (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/conversation/${lastConversation.conversation_id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Son Mesaj</Text>
                  {totalUnread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBodyMuted}>{lastConversation.name}</Text>
                <Text style={styles.cardBody} numberOfLines={1}>
                  {lastConversation.last_message_preview ?? '—'}
                </Text>
              </TouchableOpacity>
            )}

            {/* AI Briefing CTA */}
            <TouchableOpacity
              style={styles.briefingCard}
              onPress={() => router.push('/sina')}
              activeOpacity={0.85}
            >
              <Text style={styles.briefingEmoji}>✨</Text>
              <View style={styles.briefingText}>
                <Text style={styles.briefingTitle}>Sina ile Günlük Brifing Al</Text>
                <Text style={styles.briefingSubtitle}>Bakım özetini yapay zeka ile incele</Text>
              </View>
              <Text style={styles.briefingArrow}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NoPatientState({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={styles.noPatient}>
      <Text style={styles.noPatientEmoji}>👪</Text>
      <Text style={styles.noPatientTitle}>Henüz hasta bağlı değil</Text>
      <Text style={styles.noPatientSubtitle}>
        Sevdiğinizin bakımını takip etmek için hasta bağlayın.
      </Text>
      <TouchableOpacity style={styles.connectBtn} onPress={onConnect}>
        <Text style={styles.connectBtnText}>Hasta Bağla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardWarning: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody: { fontSize: 15, color: '#111827', lineHeight: 22 },
  cardBodyMuted: { fontSize: 15, color: '#9CA3AF' },

  activeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },

  medicationAlert: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  medicationAlertText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  disclaimer: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  unreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  briefingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  briefingEmoji: { fontSize: 28 },
  briefingText: { flex: 1 },
  briefingTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  briefingSubtitle: { fontSize: 13, color: '#C7D2FE', marginTop: 2 },
  briefingArrow: { fontSize: 24, color: '#fff', fontWeight: '300' },

  noPatient: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  noPatientEmoji: { fontSize: 56 },
  noPatientTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  noPatientSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  connectBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  connectBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
