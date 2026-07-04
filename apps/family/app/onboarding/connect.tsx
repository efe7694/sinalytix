import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { usePatientsStore } from '@/store/patients';
import { api } from '@/lib/api';

const BRAND = '#6366F1';

export default function ConnectScreen() {
  const router = useRouter();
  const { draft } = useOnboardingStore();
  const { fetchPatients } = usePatientsStore();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoPatientName, setAutoPatientName] = useState<string | null>(null);

  // If Akış A (deep link patient_id exists), show auto-connect UI
  const isFlowA = !!draft.pending_patient_id;

  // NOTE: /family/patients/link has no matching route in the old backend —
  // there's no family-scoped patient-link endpoint, only /caregiver/patients/link
  // (CaregiverLink-backed, wrong domain). Both handlers below will fail and
  // fall through to the "Şimdilik Geç" skip path until the new backend's Faz 1
  // (PatientFamilyLink/FamilyLinkCode) ships — known-broken, not an oversight.
  const handleAutoConnect = async () => {
    if (!draft.pending_patient_id) return;
    setIsLoading(true);
    try {
      const res = await api.post<{ patient_name: string }>('/family/patients/link', {
        patient_id: draft.pending_patient_id,
        source: 'invite_link',
      });
      setAutoPatientName(res.patient_name);
      await fetchPatients();
      router.replace('/onboarding/done');
    } catch {
      setError('Bağlantı kurulamadı. Lütfen manuel yöntem deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeConnect = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      await api.post('/family/patients/link', { code, source: 'manual_code' });
      await fetchPatients();
      router.replace('/onboarding/done');
    } catch {
      setError('Geçersiz veya süresi dolmuş kod. Hasta uygulamasından yeni kod isteyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => router.replace('/onboarding/done');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hasta Bağla</Text>
        <Text style={styles.subtitle}>
          Bakım sürecini takip edebilmek için bir hasta ile bağlantı kurun.
        </Text>

        {isFlowA ? (
          <View style={styles.autoBox}>
            <Text style={styles.autoText}>
              Bir davet linki ile geldiniz. Hastanızla bağlantı kurmak ister misiniz?
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
              onPress={handleAutoConnect}
              disabled={isLoading}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Bağlanıyor...' : 'Bağlantı Kur'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>6 Haneli Kod</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(v) => { if (/^\d{0,6}$/.test(v)) setCode(v); }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (code.length !== 6 || isLoading) && styles.primaryBtnDisabled]}
              onPress={handleCodeConnect}
              disabled={code.length !== 6 || isLoading}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Bağlanıyor...' : 'Kodu Doğrula'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Şimdilik Geç</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, gap: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  autoBox: { gap: 16 },
  autoText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  codeBox: { gap: 12 },
  codeLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 18,
    fontSize: 28,
    color: '#111827',
    letterSpacing: 8,
  },
  error: { fontSize: 13, color: '#DC2626' },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#C7D2FE' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actions: { paddingHorizontal: 24, paddingBottom: 40 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
});
