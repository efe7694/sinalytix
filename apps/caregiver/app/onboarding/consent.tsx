import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';

interface CheckboxRowProps {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

function CheckboxRow({ checked, onPress, children }: CheckboxRowProps) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.checkLabel}>{children}</View>
    </TouchableOpacity>
  );
}

export default function ConsentScreen() {
  const router = useRouter();
  const { draft, setConsent, setStep, isConsentComplete } = useOnboardingStore();
  const c = draft.consent;

  const toggle = (field: keyof typeof c) => {
    if (typeof c[field] === 'boolean') {
      setConsent({
        [field]: !c[field],
        ...(field === 'accept_tos' || field === 'accept_privacy'
          ? {}
          : {}),
      });
      if (!c.consented_at) {
        setConsent({ consented_at: new Date().toISOString() });
      }
    }
  };

  const handleNext = () => {
    setStep('profile');
    router.push('/onboarding/profile');
  };

  const complete = isConsentComplete();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.step}>2 / 4</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Rıza ve Güvenlik</Text>

        <View style={styles.safetyBanner}>
          <Text style={styles.safetyText}>
            Sinalytix teşhis koymaz, tedavi önermez. Bakım koordinasyonu ve görev yönetimi aracıdır.
          </Text>
        </View>

        <CheckboxRow checked={c.accept_tos} onPress={() => toggle('accept_tos')}>
          <Text style={styles.checkText}>
            <Text style={styles.link}>Kullanım Koşulları</Text>
            {"'nı okudum ve kabul ediyorum"}
          </Text>
        </CheckboxRow>

        <CheckboxRow checked={c.accept_privacy} onPress={() => toggle('accept_privacy')}>
          <Text style={styles.checkText}>
            <Text style={styles.link}>Gizlilik Politikası</Text>
            {"'nı okudum ve kabul ediyorum"}
          </Text>
        </CheckboxRow>

        <CheckboxRow checked={c.ack_not_emergency} onPress={() => toggle('ack_not_emergency')}>
          <Text style={styles.checkText}>
            Bu uygulama acil durum servisi değildir. Acil durumlarda{' '}
            <Text style={styles.emphasis}>911</Text>'i ararım.
          </Text>
        </CheckboxRow>

        <CheckboxRow
          checked={c.ack_no_clinical_decision}
          onPress={() => toggle('ack_no_clinical_decision')}
        >
          <Text style={styles.checkText}>
            Bu uygulama klinik karar verme yetkisine sahip değildir. Klinik sorumluluk bana ve/veya
            yetkili sağlık profesyoneline aittir.
          </Text>
        </CheckboxRow>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !complete && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!complete}
        >
          <Text style={styles.primaryBtnText}>Kabul Et ve Devam</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  back: { fontSize: 16, color: '#059669', fontWeight: '500' },
  step: { fontSize: 14, color: '#9CA3AF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 16 },
  safetyBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  safetyText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#059669', borderColor: '#059669' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1 },
  checkText: { fontSize: 14, color: '#374151', lineHeight: 21 },
  link: { color: '#059669', textDecorationLine: 'underline' },
  emphasis: { fontWeight: '700', color: '#DC2626' },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
