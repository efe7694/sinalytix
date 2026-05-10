import { Alert, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { api } from '@/lib/api';

export default function AuthMethodScreen() {
  const router = useRouter();
  const { setTokens, setDevSession } = useAuthStore();
  const { draft, setStep } = useOnboardingStore();

  const handleGoogle = () => {
    Alert.alert('Google ile Giriş', 'Google OAuth henüz yapılandırılmadı. Lütfen telefon numarasıyla devam edin.');
  };

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const res = await api.post<{ access_token: string }>('/auth/apple', {
        identity_token: credential.identityToken,
        user_type: 'caregiver',
      });
      await setTokens(res.access_token);
      await completeOnboarding(credential.email ?? undefined, undefined, 'apple');
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        console.warn('Apple auth error', e);
      }
    }
  };

  const handlePhone = () => {
    setStep('auth');
    router.push('/onboarding/phone');
  };

  const handleDevLogin = async () => {
    await setDevSession();
    router.replace('/(main)');
  };

  const completeOnboarding = async (
    email?: string,
    phone?: string,
    authMethod: string = 'phone_otp',
  ) => {
    try {
      await api.post('/caregiver/onboarding/complete', {
        language: draft.language,
        consent: draft.consent,
        first_name: draft.profile.first_name,
        last_name: draft.profile.last_name,
        auth_method: authMethod,
        email: email ?? null,
        phone: phone ?? null,
        tos_version: '1.0.0',
      });
    } catch (e) {
      console.warn('Onboarding transfer error — will retry on next launch', e);
    }
    router.replace('/onboarding/done');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.step}>4 / 4</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Giriş Yöntemi</Text>
        <Text style={styles.subtitle}>
          Hesabınızı güvenli şekilde oluşturmak için bir yöntem seçin.
        </Text>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleApple}
          />
        )}

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={handleGoogle}
          activeOpacity={0.8}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.outlineBtnText}>Google ile Devam</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineBtn} onPress={handlePhone} activeOpacity={0.8}>
          <Text style={styles.outlineBtnText}>📱 Telefon Numarasıyla Devam</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={handleDevLogin} activeOpacity={0.8}>
            <Text style={styles.devLabel}>🛠 Dev Girişi</Text>
          </TouchableOpacity>
        )}
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
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 14 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  appleBtn: { height: 54, width: '100%' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
  },
  outlineBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    fontStyle: 'italic',
  },
  devBtn: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
  },
  devLabel: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
