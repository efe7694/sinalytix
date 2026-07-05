import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { coreApi, ApiError } from '@/lib/api';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canSend = phone.replace(/\D/g, '').length >= 10;

  const handleSend = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Robust to the user typing the country code or not: 11 digits starting
      // with 1 → already includes +1; 10 digits → prepend +1. Avoids the
      // double-prefix bug (+1 416... → +114165550123) that would send the OTP
      // to a wrong number and silently break login.
      const digits = phone.replace(/\D/g, '');
      const normalized = digits.length === 11 && digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
      await coreApi.post('/auth/otp/request', { phone_e164: normalized });
      router.push({ pathname: '/onboarding/otp', params: { phone: normalized } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Çok fazla kod isteği. Lütfen biraz bekleyin.');
      } else {
        setError('Kod gönderilemedi. Tekrar dene.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Telefon Numarası</Text>
        <Text style={styles.subtitle}>
          Doğrulama kodu göndereceğiz. Kısa mesaj ücretleri uygulanabilir.
        </Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 416 555 0123"
          keyboardType="phone-pad"
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSend || isLoading) && styles.primaryBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend || isLoading}
        >
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 16, color: '#059669', fontWeight: '500' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
    letterSpacing: 1,
  },
  error: { color: '#DC2626', fontSize: 14, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
