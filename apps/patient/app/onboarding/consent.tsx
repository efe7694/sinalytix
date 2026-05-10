import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import OnboardingScreen from '@/components/OnboardingScreen';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

const CHECKBOXES = [
  {
    key: 'accept_tos' as const,
    label: "Kullanım Koşulları'nı okudum ve kabul ediyorum",
  },
  {
    key: 'accept_privacy' as const,
    label: 'Gizlilik Politikasını okudum ve kabul ediyorum',
  },
  {
    key: 'ack_not_emergency' as const,
    label: 'Bu uygulama acil durum servisi değildir. Acil durumlarda 911\'i ararım.',
  },
];

export default function ConsentScreen() {
  const router = useRouter();
  const { draft, setConsent, setStep } = useOnboardingStore();
  const { consent } = draft;

  const allAccepted =
    consent.accept_tos && consent.accept_privacy && consent.ack_not_emergency;

  function toggle(key: keyof typeof consent) {
    if (key === 'consented_at') return;
    setConsent({ [key]: !consent[key] });
  }

  function handleContinue() {
    setConsent({ consented_at: new Date().toISOString() });
    setStep('ec');
    router.push('/onboarding/emergency-contact');
  }

  return (
    <OnboardingScreen
      title="Rıza ve Güvenlik"
      primaryLabel="Kabul Et ve Devam"
      onPrimary={handleContinue}
      primaryDisabled={!allAccepted}
      secondaryLabel="Geri"
      onSecondary={() => router.back()}
      step={2}
      totalSteps={6}
      scrollable
    >
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Sinalytix teşhis koymaz, tedavi önermez. Klinik kararlar yalnızca lisanslı sağlık
          profesyonellerine aittir.
        </Text>
      </View>

      <View style={styles.checkboxes}>
        {CHECKBOXES.map((item) => {
          const checked = consent[item.key] as boolean;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.checkboxRow}
              onPress={() => toggle(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.box, checked && styles.boxChecked]}>
                {checked && <Text style={styles.tick}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  disclaimerText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  checkboxes: { gap: SPACING.MD },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  boxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tick: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  checkboxLabel: {
    flex: 1,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
});
