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

const BRAND = '#6366F1';

interface SymptomReport {
  report_id: string;
  patient_id: string;
  symptom_text: string;
  created_at: string;
  severity: 'mild' | 'moderate' | 'severe' | null;
  duration_hours: number | null;
  ai_summary: string | null;
  ai_risk_level: 'low' | 'moderate' | 'high' | null;
  is_read_by_family: boolean;
  escalated_to_caregiver: boolean;
  caregiver_notes: string | null;
}

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  mild: { label: 'Hafif', color: '#16A34A', bg: '#DCFCE7' },
  moderate: { label: 'Orta', color: '#D97706', bg: '#FEF3C7' },
  severe: { label: 'Şiddetli', color: '#DC2626', bg: '#FEE2E2' },
};

const RISK_META: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Düşük Risk', color: '#16A34A', bg: '#DCFCE7' },
  moderate: { label: 'Orta Risk', color: '#D97706', bg: '#FEF3C7' },
  high: { label: 'Yüksek Risk', color: '#DC2626', bg: '#FEE2E2' },
};

export default function SymptomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<SymptomReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<SymptomReport>(`/family/symptoms/${id}`)
      .then((data) => setReport(data ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  const severityMeta = report?.severity ? SEVERITY_META[report.severity] : null;
  const riskMeta = report?.ai_risk_level ? RISK_META[report.ai_risk_level] : null;

  const formattedDate = report
    ? new Date(report.created_at).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Semptom Bildirimi</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND} />
      ) : !report ? (
        <Text style={styles.empty}>Bildirim bulunamadı.</Text>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Datetime */}
          <Text style={styles.datetime}>{formattedDate}</Text>

          {/* Symptom text */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Semptom</Text>
            <Text style={styles.symptomText}>{report.symptom_text}</Text>
          </View>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {severityMeta && (
              <View style={[styles.badge, { backgroundColor: severityMeta.bg }]}>
                <Text style={[styles.badgeText, { color: severityMeta.color }]}>{severityMeta.label}</Text>
              </View>
            )}
            {report.duration_hours != null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {report.duration_hours < 1
                    ? `${Math.round(report.duration_hours * 60)} dk`
                    : `${report.duration_hours} sa`} önce başladı
                </Text>
              </View>
            )}
            {report.escalated_to_caregiver && (
              <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.badgeText, { color: BRAND }]}>Bakıcıya İletildi</Text>
              </View>
            )}
          </View>

          {/* AI summary */}
          {report.ai_summary && (
            <View style={[styles.aiCard, riskMeta && { borderColor: riskMeta.color + '40' }]}>
              <View style={styles.aiCardHeader}>
                <Text style={styles.aiCardTitle}>✨ Sina Analizi</Text>
                {riskMeta && (
                  <View style={[styles.riskBadge, { backgroundColor: riskMeta.bg }]}>
                    <Text style={[styles.riskBadgeText, { color: riskMeta.color }]}>{riskMeta.label}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.aiSummaryText}>{report.ai_summary}</Text>
              <Text style={styles.aiDisclaimer}>
                ⚠ Bu analiz tıbbi tavsiye niteliği taşımaz. Acil durum için 911&apos;i arayın.
              </Text>
            </View>
          )}

          {/* Caregiver notes */}
          {report.caregiver_notes && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Bakıcı Notu</Text>
              <Text style={styles.notesText}>{report.caregiver_notes}</Text>
            </View>
          )}

          {/* Emergency CTA */}
          <View style={styles.emergencyNote}>
            <Text style={styles.emergencyText}>
              Belirtiler kötüleşirse veya acil bir durum varsa 911&apos;i arayın.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
  scrollContent: { padding: 16, gap: 16 },
  datetime: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  symptomText: { fontSize: 16, color: '#111827', lineHeight: 24 },
  notesText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  riskBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  aiSummaryText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  aiDisclaimer: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  emergencyNote: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyText: { fontSize: 13, color: '#92400E', lineHeight: 19, textAlign: 'center' },
});
