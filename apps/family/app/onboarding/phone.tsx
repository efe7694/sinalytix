import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { coreApi, ApiError } from '@/lib/api';

const BRAND = '#6366F1';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = phone.replace(/\D/g, '').length >= 10;

  const handleSend = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError('');
    try {
      // Robust to the user including the country code or not — avoids the
      // double-prefix bug (+1 416... → +114165550123) that would break login.
      const digits = phone.replace(/\D/g, '');
      const normalized = digits.length === 11 && digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
      await coreApi.post('/auth/otp/request', { phone_e164: normalized });
      router.push({ pathname: '/onboarding/otp', params: { phone: normalized } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Çok fazla kod isteği. Lütfen biraz bekleyin.');
      } else {
        setError('Kod gönderilemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Telefon Numarası</Text>
          <Text style={styles.subtitle}>
            Güvenlik kodu göndermek için telefon numaranızı girin.
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇨🇦 +1</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="416 555 0123"
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isValid || isLoading) && styles.primaryBtnDisabled]}
            onPress={handleSend}
            disabled={!isValid || isLoading}
          >
            <Text style={styles.primaryBtnText}>
              {isLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, gap: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
  },
  countryCodeText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  error: { fontSize: 13, color: '#DC2626', marginTop: -8 },
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
