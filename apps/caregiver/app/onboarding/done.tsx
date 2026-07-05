import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePatientsStore } from '@/store/patients';
import { useOnboardingStore } from '@/store/onboarding';
import { ApiError } from '@/lib/api';

export default function DoneScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { linkPatient } = usePatientsStore();
  const { clearDraft } = useOnboardingStore();

  const [linkCode, setLinkCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleLink = async () => {
    if (linkCode.trim().length < 6) return;
    setIsLinking(true);
    setLinkError('');
    try {
      const patient = await linkPatient(linkCode.trim().toUpperCase());
      await clearDraft();
      // Confirm success by showing who we just linked to before entering the app.
      const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();
      Alert.alert('Hasta Bağlandı', name ? `${name} ile bağlantı kuruldu.` : 'Hasta ile bağlantı kuruldu.', [
        { text: 'Devam', onPress: () => router.replace('/(main)') },
      ]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        const secs = e.retryAfterSeconds;
        setLinkError(
          secs
            ? `Çok fazla hatalı deneme. ${Math.ceil(secs / 60)} dakika sonra tekrar deneyin.`
            : 'Çok fazla hatalı deneme. Lütfen daha sonra tekrar deneyin.',
        );
      } else if (e instanceof ApiError && e.status === 409) {
        setLinkError('Bu hastayla zaten bağlısınız.');
      } else {
        setLinkError('Geçersiz veya süresi dolmuş kod. Hastadan yeni bir kod isteyin.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleSkip = async () => {
    await clearDraft();
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>Hazırsın.</Text>
        <Text style={styles.subtitle}>
          Merhaba, {profile?.first_name ?? 'Bakıcı'}! Hesabın oluşturuldu.
        </Text>
        <Text style={styles.caption}>
          İlk hastanı bağlayarak başlayabilirsin. Hastanın Sinalytix uygulamasından ürettiği
          6 haneli kodu gir.
        </Text>

        {showLinkInput ? (
          <View style={styles.linkSection}>
            <TextInput
              style={styles.codeInput}
              value={linkCode}
              onChangeText={(v) => setLinkCode(v.toUpperCase())}
              placeholder="XXXXXX"
              autoCapitalize="characters"
              maxLength={6}
              textAlign="center"
              autoFocus
            />
            {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryBtn, (linkCode.length < 6 || isLinking) && styles.primaryBtnDisabled]}
              onPress={handleLink}
              disabled={linkCode.length < 6 || isLinking}
            >
              <Text style={styles.primaryBtnText}>
                {isLinking ? 'Bağlanıyor...' : 'Hasta Bağla'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLinkInput(true)}>
            <Text style={styles.primaryBtnText}>İlk Hastanı Bağla</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Şimdilik Geç</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 18, color: '#374151', textAlign: 'center' },
  caption: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  linkSection: { width: '100%', gap: 12 },
  codeInput: {
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: '#9CA3AF', fontSize: 15 },
});
