import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';

const BRAND = '#6366F1';

export default function ConsentScreen() {
  const router = useRouter();
  const { draft, setConsent, setStep } = useOnboardingStore();

  const [tos, setTos] = useState(draft.consent.accept_tos);
  const [privacy, setPrivacy] = useState(draft.consent.accept_privacy);
  const [emergency, setEmergency] = useState(draft.consent.ack_not_emergency);

  const allChecked = tos && privacy && emergency;

  const handleContinue = async () => {
    if (!allChecked) return;
    await setConsent({
      accept_tos: true,
      accept_privacy: true,
      ack_not_emergency: true,
      consented_at: new Date().toISOString(),
    });
    await setStep('profile');
    router.push('/onboarding/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Rıza ve Güvenlik Uyarıları</Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ Sinalytix teşhis koymaz, tedavi önermez. Bakım koordinasyonu ve görev
            yönetimi aracıdır.
          </Text>
        </View>

        <View style={styles.checkboxes}>
          <CheckboxRow
            checked={tos}
            onToggle={() => setTos((v) => !v)}
            label="Kullanım Koşulları'nı okudum ve kabul ediyorum"
            linkText="Kullanım Koşulları"
            onLink={() => Linking.openURL('https://sinalytix.com/terms')}
          />
          <CheckboxRow
            checked={privacy}
            onToggle={() => setPrivacy((v) => !v)}
            label="Gizlilik Politikasını okudum ve kabul ediyorum"
            linkText="Gizlilik Politikası"
            onLink={() => Linking.openURL('https://sinalytix.com/privacy')}
          />
          <CheckboxRow
            checked={emergency}
            onToggle={() => setEmergency((v) => !v)}
            label="Bu uygulama acil durum servisi değildir. Acil durumlarda 911'i ararım."
          />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, !allChecked && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!allChecked}
        >
          <Text style={styles.primaryBtnText}>Kabul Et ve Devam</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function CheckboxRow({
  checked,
  onToggle,
  label,
  linkText,
  onLink,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  linkText?: string;
  onLink?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>
        {linkText && onLink ? (
          <>
            {label.replace(linkText, '')}{' '}
            <Text style={styles.link} onPress={onLink}>
              {linkText}
            </Text>
          </>
        ) : (
          label
        )}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 20 },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
  checkboxes: { gap: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  link: { color: BRAND, fontWeight: '600', textDecorationLine: 'underline' },
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#C7D2FE' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#6B7280', fontSize: 14 },
});
