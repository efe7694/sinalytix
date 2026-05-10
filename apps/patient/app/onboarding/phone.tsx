import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OnboardingScreen from '@/components/OnboardingScreen';
import { BASE_URL } from '@/lib/api';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '@sinalytix/ui';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw;
}

function isValidPhone(phone: string): boolean {
  return /^\+1\d{10}$/.test(normalizePhone(phone));
}

export default function PhoneScreen() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handlePhoneChange(text: string) {
    setPhone(text);
    if (error) setError('');
  }

  async function handleSendOtp() {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(phone)) {
      setError('Geçerli bir Kanada/ABD numarası girin (+1 XXX XXX XXXX)');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          setError('Çok fazla kod isteği. 10 dakika bekle.');
        } else {
          setError(body.detail ?? 'Kod gönderilemedi. Lütfen tekrar dene.');
        }
        return;
      }

      router.push({
        pathname: '/onboarding/otp',
        params: { phone: normalized, ...(flow ? { flow } : {}) },
      });
    } catch {
      setError('Bağlantı hatası. İnterneti kontrol et.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingScreen
      title="Telefon Numarası"
      subtitle="Sana doğrulama kodu göndereceğiz."
      primaryLabel={loading ? 'Gönderiliyor...' : 'Kod Gönder'}
      onPrimary={handleSendOtp}
      primaryDisabled={!isValidPhone(phone) || loading}
      secondaryLabel="Geri"
      onSecondary={() => router.back()}
      step={5}
      totalSteps={6}
    >
      <View style={styles.field}>
        <Text style={styles.label}>Telefon Numarası</Text>
        <View style={styles.inputRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+1</Text>
          </View>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="(416) 555 0100"
            placeholderTextColor={COLORS.textDisabled}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            autoFocus
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Text style={styles.hint}>
          Kanada/ABD numaraları desteklenmektedir. Oran sınırı: 3 kod / 10 dakika.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.XS },
  label: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  inputRow: { flexDirection: 'row', gap: SPACING.XS },
  countryCode: {
    width: 52,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: COLORS.surface,
  },
  countryCodeText: { fontSize: FONT_SIZE.BODY, color: COLORS.textPrimary, fontWeight: '600' },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: 52,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: FONT_SIZE.CAPTION, color: COLORS.error },
  hint: { fontSize: FONT_SIZE.CAPTION, color: COLORS.textDisabled, lineHeight: 18 },
});
