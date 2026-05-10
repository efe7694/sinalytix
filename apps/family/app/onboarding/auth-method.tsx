import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { api } from '@/lib/api';

const BRAND = '#6366F1';

WebBrowser.maybeCompleteAuthSession();

export default function AuthMethodScreen() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const { draft } = useOnboardingStore();

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const res = await api.post<{ access_token: string }>('/family/auth/apple', {
        identity_token: credential.identityToken,
        draft,
      });
      await setTokens(res.access_token);
      router.replace('/onboarding/connect');
    } catch {
      // user cancelled or error — stay on screen
    }
  };

  const handlePhone = () => {
    router.push('/onboarding/phone');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Giriş Yöntemi</Text>
        <Text style={styles.subtitle}>Hesabınızı oluşturmak için bir yöntem seçin.</Text>

        <View style={styles.methods}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleApple}
          />

          <TouchableOpacity style={styles.methodBtn} onPress={handlePhone}>
            <Text style={styles.methodIcon}>📱</Text>
            <Text style={styles.methodLabel}>Telefon Numarasıyla Devam</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, gap: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  methods: { gap: 14 },
  appleBtn: { width: '100%', height: 52 },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  methodIcon: { fontSize: 20 },
  methodLabel: { fontSize: 16, color: '#374151', fontWeight: '500' },
  actions: { paddingHorizontal: 24, paddingBottom: 32 },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#6B7280', fontSize: 14 },
});
