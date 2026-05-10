import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { draft, setLanguage, setStep } = useOnboardingStore();
  const selected = draft.language;

  const handleNext = () => {
    setStep('consent');
    router.push('/onboarding/consent');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.step}>1 / 4</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Dil seçin</Text>
        <Text style={styles.subtitle}>
          Seçtiğiniz dil uygulama genelinde tüm içeriği etkiler.
        </Text>

        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.option, selected === lang.code && styles.optionSelected]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={[styles.optionNative, selected === lang.code && styles.optionTextSelected]}>
              {lang.native}
            </Text>
            <Text style={[styles.optionLabel, selected === lang.code && styles.optionLabelSelected]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !selected && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  back: { fontSize: 16, color: '#059669', fontWeight: '500' },
  step: { fontSize: 14, color: '#9CA3AF' },
  body: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  option: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  optionNative: { fontSize: 17, fontWeight: '600', color: '#111827' },
  optionTextSelected: { color: '#059669' },
  optionLabel: { fontSize: 14, color: '#9CA3AF' },
  optionLabelSelected: { color: '#6EE7B7' },
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
