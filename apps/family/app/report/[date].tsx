import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { usePatientsStore } from '@/store/patients';

const BRAND = '#6366F1';

interface DailyReportTask {
  task_id: string;
  title: string;
  subtype: string;
  status: 'done' | 'skipped' | 'todo';
  completed_by_role: string | null;
  completed_at: string | null;
}

interface DailyReport {
  report_date: string;
  patient_id: string;
  tasks_total: number;
  tasks_completed: number;
  tasks_skipped: number;
  medication_count: number;
  medication_completed: number;
  shift_count: number;
  shift_duration_minutes: number;
  symptom_count: number;
  sos_count: number;
  ai_summary: string | null;
  tasks: DailyReportTask[];
}

export default function DailyReportScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatientId || !date) return;
    api.get<DailyReport>(`/family/patients/${selectedPatientId}/reports/${date}`)
      .then((data) => setReport(data ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedPatientId, date]);

  const formattedDate = date
    ? new Date(date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const roleEmoji: Record<string, string> = {
    patient: '🧑',
    caregiver: '👩‍⚕️',
    family: '👪',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Günlük Rapor</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND} />
      ) : !report ? (
        <Text style={styles.empty}>Bu tarih için rapor bulunamadı.</Text>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.reportDate}>{formattedDate}</Text>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="✅"
              value={`${report.tasks_completed}/${report.tasks_total}`}
              label="Görev"
              color="#059669"
            />
            <StatCard
              icon="💊"
              value={`${report.medication_completed}/${report.medication_count}`}
              label="İlaç"
              color={report.medication_completed < report.medication_count ? '#D97706' : '#059669'}
            />
            <StatCard
              icon="👩‍⚕️"
              value={`${report.shift_count}`}
              label="Vardiya"
              color={BRAND}
            />
            <StatCard
              icon="🩺"
              value={`${report.symptom_count}`}
              label="Semptom"
              color={report.symptom_count > 0 ? '#7C3AED' : '#9CA3AF'}
            />
          </View>

          {report.sos_count > 0 && (
            <View style={styles.sosAlert}>
              <Text style={styles.sosAlertText}>🚨 {report.sos_count} SOS çağrısı tetiklendi</Text>
            </View>
          )}

          {/* AI summary */}
          {report.ai_summary && (
            <View style={styles.aiCard}>
              <Text style={styles.aiCardTitle}>✨ Sina Günlük Özeti</Text>
              <Text style={styles.aiSummaryText}>{report.ai_summary}</Text>
              <Text style={styles.aiDisclaimer}>
                ⚠ Bu özet klinik değerlendirme yerine geçmez.
              </Text>
            </View>
          )}

          {/* Task breakdown */}
          {report.tasks.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Görev Detayı</Text>
              {report.tasks.map((t) => (
                <View
                  key={t.task_id}
                  style={[
                    styles.taskRow,
                    t.status === 'done' && styles.taskRowDone,
                    t.status === 'skipped' && styles.taskRowSkipped,
                  ]}
                >
                  <View style={styles.taskLeft}>
                    {t.subtype === 'medication' && <Text style={styles.medIcon}>💊 </Text>}
                    <Text style={[
                      styles.taskTitle,
                      t.status === 'done' && styles.taskTitleDone,
                      t.status === 'skipped' && styles.taskTitleSkipped,
                    ]}>
                      {t.title}
                    </Text>
                  </View>
                  <View style={styles.taskRight}>
                    {t.status === 'done' && t.completed_by_role && (
                      <Text>{roleEmoji[t.completed_by_role] ?? '?'}</Text>
                    )}
                    <View style={[
                      styles.statusDot,
                      t.status === 'done' ? styles.statusDotDone :
                      t.status === 'skipped' ? styles.statusDotSkipped :
                      styles.statusDotPending,
                    ]} />
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

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  empty: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  reportDate: { fontSize: 16, fontWeight: '700', color: '#111827' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  sosAlert: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sosAlertText: { fontSize: 14, color: '#DC2626', fontWeight: '700', textAlign: 'center' },

  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  aiCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  aiSummaryText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  aiDisclaimer: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  taskRowDone: { borderColor: '#DCFCE7' },
  taskRowSkipped: { opacity: 0.55 },
  taskLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  medIcon: { fontSize: 14 },
  taskTitle: { flex: 1, fontSize: 14, color: '#111827', lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  taskTitleSkipped: { color: '#9CA3AF' },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotDone: { backgroundColor: '#16A34A' },
  statusDotSkipped: { backgroundColor: '#D97706' },
  statusDotPending: { backgroundColor: '#D1D5DB' },
});
