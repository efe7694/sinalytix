import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { usePatientsStore } from '@/store/patients';
import { coreApi, ApiError } from '@/lib/api';

const BRAND = '#6366F1';

interface RedeemedLink {
  status: 'pending_patient_confirm' | 'active' | 'revoked';
  source: 'code' | 'qr' | 'ec_invite';
}

export default function ConnectScreen() {
  const router = useRouter();
  const { draft } = useOnboardingStore();
  const { fetchPatients } = usePatientsStore();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // NOTE: Flow A (deep-link auto-connect) is intentionally not wired here.
  // The redeem endpoint needs a code/qr_payload, but a deep link would carry
  // a bare patient_id — not interchangeable — and the deep-link generation
  // that would set draft.pending_patient_id doesn't exist yet. The only live
  // path is the manual 6-digit code below, which also covers the ec_invite
  // case (patient taps "Aileye Davet Et" on an emergency contact and reads
  // out the code). Flow A returns when deep-link generation lands.

  const handleCodeConnect = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      // relationship is only required for a generic code/qr redeem; an
      // ec_invite code inherits it from the emergency-contact row, so we
      // send whatever the onboarding profile step captured (may be null for
      // the ec_invite path, which is fine).
      const link = await coreApi.post<RedeemedLink>('/family-links/redeem', {
        code,
        ...(draft.profile.relationship ? { relationship: draft.profile.relationship } : {}),
      });
      await fetchPatients();
      if (link.status === 'pending_patient_confirm') {
        // code/qr path: the patient must confirm before the link is active.
        setPendingConfirm(true);
      } else {
        // ec_invite path: instant activation, go straight to done.
        router.replace('/onboarding/done');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.');
      } else if (e instanceof ApiError && e.status === 400) {
        setError('Bu kod için ilişki bilgisi gerekli. Lütfen profil adımını tamamlayın.');
      } else if (e instanceof ApiError && e.status === 409) {
        setError('Bu hastayla zaten bir bağlantınız var.');
      } else {
        setError('Geçersiz veya süresi dolmuş kod. Hasta uygulamasından yeni kod isteyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => router.replace('/onboarding/done');

  if (pendingConfirm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Onay Bekleniyor</Text>
          <Text style={styles.subtitle}>
            Bağlantı isteğiniz hastaya iletildi. Hasta, kendi uygulamasından
            onayladığında bağlantınız aktifleşecek ve hastayı burada
            görebileceksiniz.
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.replace('/onboarding/done')} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hasta Bağla</Text>
        <Text style={styles.subtitle}>
          Bakım sürecini takip edebilmek için, hastanın uygulamasında oluşturduğu
          6 haneli bağlantı kodunu girin.
        </Text>

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
