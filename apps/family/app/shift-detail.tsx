import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { usePatientsStore } from '@/store/patients';

const BRAND = '#6366F1';

interface ShiftDetail {
  shift_id: string;
  caregiver_id: string;
  caregiver_name: string;
  caregiver_agency: string | null;
  status: 'active' | 'completed' | 'cancelled';
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  tasks_completed: number;
  tasks_total: number;
  location_verified: boolean;
}

interface ShiftHistoryItem {
  shift_id: string;
  caregiver_name: string;
  status: 'completed' | 'cancelled';
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
}

export default function ShiftDetailScreen() {
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const [active, setActive] = useState<ShiftDetail | null>(null);
  const [history, setHistory] = useState<ShiftHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    try {
      const [activeData, historyData] = await Promise.all([
        api.get<ShiftDetail | null>(`/family/patients/${selectedPatientId}/shift/active`).catch(() => null),
        api.get<ShiftHistoryItem[]>(`/family/patients/${selectedPatientId}/shifts`).catch(() => []),
      ]);
      setActive(activeData ?? null);
      setHistory(historyData ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedPatientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bakıcı Vardiyası</Text>
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Active shift */}
          {active ? (
            <View style={[styles.card, active.status === 'active' && styles.cardActive]}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Aktif Vardiya</Text>
                {active.status === 'active' && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>Devam Ediyor</Text>
                  </View>
                )}
              </View>

              <Text style={styles.caregiverName}>{active.caregiver_name}</Text>
              {active.caregiver_agency && (
                <Text style={styles.caregiverAgency}>{active.caregiver_agency}</Text>
              )}

              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Giriş</Text>
                  <Text style={styles.timeValue}>{formatTime(active.check_in_at)}</Text>
                </View>
                <Text style={styles.timeSep}>→</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Çıkış</Text>
                  <Text style={styles.timeValue}>
                    {active.check_out_at ? formatTime(active.check_out_at) : '—'}
                  </Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Süre</Text>
                  <Text style={styles.timeValue}>{formatDuration(active.duration_minutes)}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <StatPill
                  label="Görevler"
                  value={`${active.tasks_completed}/${active.tasks_total}`}
                  color="#059669"
                />
                <StatPill
                  label="Konum"
                  value={active.location_verified ? 'Doğrulandı ✓' : 'Doğrulanmadı'}
                  color={active.location_verified ? '#059669' : '#D97706'}
                />
              </View>

              {active.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Not</Text>
                  <Text style={styles.notesText}>{active.notes}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noShiftCard}>
              <Text style={styles.noShiftEmoji}>🔴</Text>
              <Text style={styles.noShiftText}>Şu anda aktif bakıcı yok</Text>
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Geçmiş Vardiyalar</Text>
              {history.map((s) => (
                <View key={s.shift_id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{formatDate(s.check_in_at)}</Text>
                    <Text style={styles.historyCaregiver}>{s.caregiver_name}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyDuration}>{formatDuration(s.duration_minutes)}</Text>
                    <View style={[
                      styles.historyStatus,
                      s.status === 'cancelled' ? styles.historyStatusCancelled : styles.historyStatusDone,
                    ]}>
                      <Text style={[
                        styles.historyStatusText,
                        s.status === 'cancelled' ? styles.historyStatusCancelledText : styles.historyStatusDoneText,
                      ]}>
                        {s.status === 'cancelled' ? 'İptal' : 'Tamamlandı'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '30', backgroundColor: color + '10' }]}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardActive: { borderColor: '#6366F120', backgroundColor: '#FAFBFF' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  activeBadgeText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  caregiverName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  caregiverAgency: { fontSize: 14, color: '#6B7280', marginTop: -6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBlock: { flex: 1, alignItems: 'center', gap: 2 },
  timeLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  timeValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  timeSep: { fontSize: 16, color: '#D1D5DB' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700' },
  notesBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, gap: 4 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },

  noShiftCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  noShiftEmoji: { fontSize: 36 },
  noShiftText: { fontSize: 15, color: '#9CA3AF' },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  historyLeft: { flex: 1, gap: 2 },
  historyDate: { fontSize: 13, color: '#6B7280' },
  historyCaregiver: { fontSize: 15, fontWeight: '600', color: '#111827' },
  historyRight: { alignItems: 'flex-end', gap: 6 },
  historyDuration: { fontSize: 14, fontWeight: '600', color: '#374151' },
  historyStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  historyStatusDone: { backgroundColor: '#DCFCE7' },
  historyStatusCancelled: { backgroundColor: '#FEE2E2' },
  historyStatusText: { fontSize: 11, fontWeight: '600' },
  historyStatusDoneText: { color: '#16A34A' },
  historyStatusCancelledText: { color: '#DC2626' },
});
