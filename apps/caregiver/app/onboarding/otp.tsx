import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { api } from '@/lib/api';

const OTP_TIMEOUT = 300; // 5 minutes
const MAX_ATTEMPTS = 3;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setTokens } = useAuthStore();
  const { draft } = useOnboardingStore();

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMEOUT);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCount, setResendCount] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post<{ access_token: string }>('/auth/otp/verify', {
        phone,
        code,
        user_type: 'caregiver',
      });
      await setTokens(res.access_token);
      // Transfer onboarding draft
      await api.post('/caregiver/onboarding/complete', {
        language: draft.language,
        consent: draft.consent,
        first_name: draft.profile.first_name,
        last_name: draft.profile.last_name,
        auth_method: 'phone_otp',
        phone,
        tos_version: '1.0.0',
      });
      router.replace('/onboarding/done');
    } catch (e: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Çok fazla deneme. Yeni kod iste.');
        setCode('');
      } else {
        setError(`Kod hatalı. ${MAX_ATTEMPTS - newAttempts} deneme hakkın kaldı.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= 3) return;
    setCode('');
    setError('');
    setAttempts(0);
    setSecondsLeft(OTP_TIMEOUT);
    setResendCount((c) => c + 1);
    try {
      await api.post('/auth/otp/send', { phone, user_type: 'caregiver' });
    } catch {
      setError('Kod gönderilemedi.');
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const maxAttemptsReached = attempts >= MAX_ATTEMPTS;
  const timedOut = secondsLeft === 0;
  const canVerify = code.length === 6 && !maxAttemptsReached && !timedOut && !isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Doğrulama Kodu</Text>
        <Text style={styles.subtitle}>
          {phone} numarasına gönderilen 6 haneli kodu girin.
        </Text>

        <TextInput
          style={[styles.input, (maxAttemptsReached || timedOut) && styles.inputDisabled]}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          editable={!maxAttemptsReached && !timedOut}
          textAlign="center"
          letterSpacing={8}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!timedOut && !maxAttemptsReached && (
          <Text style={styles.timer}>Süre: {formatTime(secondsLeft)}</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !canVerify && styles.primaryBtnDisabled]}
          onPress={handleVerify}
          disabled={!canVerify}
        >
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
          </Text>
        </TouchableOpacity>

        {(timedOut || maxAttemptsReached) && (
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={resendCount >= 3}
          >
            <Text style={[styles.resendText, resendCount >= 3 && styles.resendDisabled]}>
              Kodu Tekrar Gönder
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 16, color: '#059669', fontWeight: '500' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  inputDisabled: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
  error: { color: '#DC2626', fontSize: 14 },
  timer: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: '#059669', fontSize: 15, fontWeight: '500' },
  resendDisabled: { color: '#9CA3AF' },
});
