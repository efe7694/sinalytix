import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';
import { SafeAreaView } from 'react-native';

export default function AuthMethodScreen() {
  const router = useRouter();
  const { setStep } = useOnboardingStore();
  const { setDevSession } = useAuthStore();

  function handleApple() {
    setStep('auth');
    router.push('/onboarding/apple-auth');
  }

  function handleGoogle() {
    setStep('auth');
    router.push('/onboarding/google-auth');
  }

  function handlePhone() {
    setStep('auth');
    router.push('/onboarding/phone');
  }

  async function handleDevLogin() {
    await setDevSession();
    router.replace('/(main)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.progress}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, i < 5 && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>Giriş Yöntemi</Text>
        <Text style={styles.subtitle}>Hesabını nasıl oluşturmak istersin?</Text>
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <AuthButton
            label="Apple ile Devam"
            iconChar="🍎"
            onPress={handleApple}
            dark
          />
        )}
        <AuthButton label="Google ile Devam" iconChar="G" onPress={handleGoogle} />
        <AuthButton label="Telefon Numarasıyla Devam" iconChar="📱" onPress={handlePhone} />
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backLabel}>Geri</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity style={styles.devBtn} onPress={handleDevLogin}>
          <Text style={styles.devLabel}>🛠 Dev Girişi</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function AuthButton({
  label,
  iconChar,
  onPress,
  dark = false,
}: {
  label: string;
  iconChar: string;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.authBtn, dark && styles.authBtnDark]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.authBtnIcon}>{iconChar}</Text>
      <Text style={[styles.authBtnLabel, dark && styles.authBtnLabelDark]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.LG, paddingTop: SPACING.XL, gap: SPACING.SM },
  progress: { flexDirection: 'row', gap: SPACING.XS, marginBottom: SPACING.MD },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary },
  title: { fontSize: FONT_SIZE.H1, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary },
  buttons: {
    flex: 1,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.XL,
    gap: SPACING.MD,
    justifyContent: 'center',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.background,
  },
  authBtnDark: { backgroundColor: '#000', borderColor: '#000' },
  authBtnIcon: { fontSize: 20 },
  authBtnLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  authBtnLabelDark: { color: '#FFF' },
  backBtn: {
    alignSelf: 'center',
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  backLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary },
  devBtn: {
    alignSelf: 'center',
    marginBottom: SPACING.XL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: '#FFFBEB',
  },
  devLabel: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
