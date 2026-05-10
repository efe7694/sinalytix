import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';

const BRAND = '#6366F1';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇨🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { draft, setLanguage, setStep } = useOnboardingStore();

  const handleSelect = async (code: string) => {
    await setLanguage(code);
  };

  const handleContinue = async () => {
    if (!draft.language) return;
    await setStep('consent');
    router.push('/onboarding/consent');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dil Seçin</Text>
        <Text style={styles.subtitle}>Seçtiğiniz dil tüm uygulama içeriğini etkiler.</Text>

        <View style={styles.options}>
          {LANGUAGES.map((lang) => {
            const selected = draft.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSelect(lang.code)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, selected && styles.langLabelSelected]}>
                  {lang.label}
                </Text>
                {selected && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, !draft.language && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!draft.language}
        >
          <Text style={styles.primaryBtnText}>Devam</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionSelected: { borderColor: BRAND, backgroundColor: '#EEF2FF' },
  flag: { fontSize: 24 },
  langLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  langLabelSelected: { color: BRAND, fontWeight: '600' },
  check: { fontSize: 18, color: BRAND, fontWeight: '700' },
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
