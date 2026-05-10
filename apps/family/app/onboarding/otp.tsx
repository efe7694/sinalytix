import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { api } from '@/lib/api';

const BRAND = '#6366F1';
const OTP_TIMEOUT = 300; // 5 minutes

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setTokens } = useAuthStore();
  const { draft } = useOnboardingStore();

  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_TIMEOUT);
  const [attempts, setAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleVerify = async () => {
    if (otp.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post<{ access_token: string }>('/family/auth/otp/verify', {
        phone,
        otp,
        draft,
      });
      await setTokens(res.access_token);
      router.replace('/onboarding/connect');
    } catch (e: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Çok fazla deneme. Yeni kod isteyin.');
        setOtp('');
      } else {
        setError(`Kod hatalı. ${3 - newAttempts} deneme hakkın kaldı.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= 3 || timeLeft > 240) return;
    try {
      await api.post('/family/auth/otp/send', { phone });
      setResendCount((c) => c + 1);
      setTimeLeft(OTP_TIMEOUT);
      setAttempts(0);
      setOtp('');
      setError('');
    } catch {
      setError('Kod gönderilemedi. Lütfen bekleyin.');
    }
  };

  const maxAttempts = attempts >= 3;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Doğrulama Kodu</Text>
          <Text style={styles.subtitle}>
            <Text style={{ fontWeight: '600' }}>{phone}</Text> numarasına gönderilen 6 haneli kodu girin.
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => { if (/^\d{0,6}$/.test(v)) setOtp(v); }}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            editable={!maxAttempts && timeLeft > 0}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {timeLeft > 0 ? (
            <Text style={styles.timer}>Süre: {formatTime(timeLeft)}</Text>
          ) : (
            <Text style={styles.timerExpired}>Süre doldu. Yeni kod isteyin.</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, (otp.length !== 6 || isLoading || maxAttempts) && styles.primaryBtnDisabled]}
            onPress={handleVerify}
            disabled={otp.length !== 6 || isLoading || maxAttempts}
          >
            <Text style={styles.primaryBtnText}>{isLoading ? 'Doğrulanıyor...' : 'Doğrula'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCount >= 3}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendCount >= 3 && styles.resendDisabled]}>
              Kodu Tekrar Gönder
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, gap: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 28,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: { fontSize: 13, color: '#DC2626' },
  timer: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  timerExpired: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#C7D2FE' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14, color: BRAND, fontWeight: '600' },
  resendDisabled: { color: '#9CA3AF' },
});
