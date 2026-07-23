import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOnboardingStore, persistOnboardingCompleted, TOS_VERSION } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { BASE_URL, coreApi, ApiError } from '@/lib/api';
import OnboardingScreen from '@/components/OnboardingScreen';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '@sinalytix/ui';
import { submitConsentRecord } from '@/lib/consent';

const OTP_TIMEOUT_SEC = 300;
const MAX_RETRIES = 3;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, flow } = useLocalSearchParams<{ phone: string; flow?: string }>();
  const { setStep, markCompleted, draft } = useOnboardingStore();
  const { setTokens } = useAuthStore();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retries, setRetries] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMEOUT_SEC);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  function startTimer() {
    clearTimer();
    setTimeLeft(OTP_TIMEOUT_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          setError('Süre doldu. Lütfen yeni kod iste.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  async function handleVerify() {
    if (code.length !== 6) {
      setError('6 haneli kodu girin.');
      return;
    }
    if (retries >= MAX_RETRIES) {
      setError('Çok fazla deneme. Lütfen yeni kod iste.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await coreApi.post<{ access_token: string; refresh_token: string; user_id: string }>(
        '/auth/otp/verify',
        { phone_e164: phone, code, app_context: 'patient' },
      );
      await setTokens(data.access_token, data.refresh_token, data.user_id);
      clearTimer();

      if (flow === 'login') {
        // Returning user login — go straight to main
        router.replace('/(main)');
        return;
      }

      // Onboarding flow — submit draft
      await submitDraft(data.access_token);
      await persistOnboardingCompleted();
      markCompleted();
      setStep('done');
      router.replace('/onboarding/done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Çok fazla deneme. Lütfen yeni kod iste.');
        setRetries(MAX_RETRIES);
      } else if (err instanceof ApiError) {
        const nextRetry = retries + 1;
        setRetries(nextRetry);
        if (nextRetry >= MAX_RETRIES) {
          setError('Çok fazla deneme. Lütfen yeni kod iste.');
        } else {
          setError(`${err.message || 'Kod hatalı.'} (${nextRetry}/${MAX_RETRIES})`);
        }
      } else {
        setError('Bir hata oluştu. Lütfen tekrar dene.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitDraft(accessToken: string) {
    // Consent first, on its own call — it is the immutable legal record and
    // must land before any clinical data (Modül 1 §13). Best-effort like the
    // rest of the draft submit: onboarding is not blocked on it, and the
    // record can be re-submitted.
    try {
      await submitConsentRecord(accessToken, draft.consent, TOS_VERSION);
    } catch {
      // Non-fatal — see above.
    }

    try {
      await fetch(`${BASE_URL}/api/v1/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          language: draft.language,
          consent: draft.consent,
          emergency_contact: draft.emergency_contact,
          health_seed: draft.health_seed,
        }),
      });
    } catch {
      // Non-fatal — onboarding draft can be re-submitted later
    }
  }

  async function handleResend() {
    if (resendCount >= 3) {
      setError('Maksimum kod gönderme sınırına ulaşıldı (3/10 dk).');
      return;
    }
    setCode('');
    setError('');
    setRetries(0);

    try {
      await coreApi.post('/auth/otp/request', { phone_e164: phone });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Çok fazla kod isteği. 10 dakika bekle.');
      } else {
        setError('Kod gönderilemedi. İnterneti kontrol et.');
      }
      return;
    }

    setResendCount((c) => c + 1);
    startTimer();
  }

  return (
    <OnboardingScreen
      title="Doğrulama Kodu"
      subtitle={`${phone} numarasına gönderilen 6 haneli kodu gir.`}
      primaryLabel={loading ? 'Doğrulanıyor...' : 'Doğrula'}
      onPrimary={handleVerify}
      primaryDisabled={code.length !== 6 || loading || retries >= MAX_RETRIES}
      step={6}
      totalSteps={6}
    >
      <View style={styles.container}>
        <TextInput
          style={[styles.codeInput, error ? styles.codeInputError : null]}
          value={code}
          onChangeText={(t) => {
            setCode(t.replace(/\D/g, '').slice(0, 6));
            if (error) setError('');
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="------"
          placeholderTextColor={COLORS.textDisabled}
          textAlign="center"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleVerify}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {timeLeft > 0 ? (
          <Text style={styles.timer}>Kodun geçerlilik süresi: {timerLabel}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resendCount >= 3}
        >
          <Text style={[styles.resendLabel, resendCount >= 3 && styles.resendDisabled]}>
            Kodu Tekrar Gönder
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.MD, alignItems: 'center' },
  codeInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.LG,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 12,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    width: '100%',
    minHeight: 72,
  },
  codeInputError: { borderColor: COLORS.error },
  errorText: { fontSize: FONT_SIZE.BODY, color: COLORS.error, textAlign: 'center' },
  timer: { fontSize: FONT_SIZE.CAPTION + 1, color: COLORS.textSecondary },
  resendBtn: { paddingVertical: SPACING.SM },
  resendLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.primary, fontWeight: '600' },
  resendDisabled: { color: COLORS.textDisabled },
});
