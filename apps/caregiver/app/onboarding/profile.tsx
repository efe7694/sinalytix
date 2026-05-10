import { useEffect, useRef } from 'react';
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
import { useOnboardingStore } from '@/store/onboarding';

const NAME_REGEX = /^[a-zA-ZÀ-ÿğüşıöçĞÜŞİÖÇ '-]+$/;

function isValidName(name: string) {
  return name.length >= 2 && NAME_REGEX.test(name);
}

export default function ProfileScreen() {
  const router = useRouter();
  const { draft, setProfile, setStep } = useOnboardingStore();
  const lastNameRef = useRef<TextInput>(null);

  const firstName = draft.profile.first_name;
  const lastName = draft.profile.last_name;
  const canProceed = isValidName(firstName) && isValidName(lastName);

  const handleNext = () => {
    setStep('auth_method');
    router.push('/onboarding/auth-method');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.step}>3 / 4</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Adınız</Text>
        <Text style={styles.subtitle}>
          Platformdaki tüm etkileşimlerde bu ad kullanılır.
        </Text>

        <Text style={styles.label}>Ad</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={(v) => setProfile({ first_name: v })}
          placeholder="Adınız"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Soyad</Text>
        <TextInput
          ref={lastNameRef}
          style={styles.input}
          value={lastName}
          onChangeText={(v) => setProfile({ last_name: v })}
          placeholder="Soyadınız"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={canProceed ? handleNext : undefined}
        />
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.primaryBtnText}>Devam</Text>
        </TouchableOpacity>
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
  body: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
