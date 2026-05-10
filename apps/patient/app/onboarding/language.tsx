import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useOnboardingStore } from '@/store/onboarding';
import OnboardingScreen from '@/components/OnboardingScreen';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'tr', label: 'Türkçe' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { draft, setLanguage, setStep } = useOnboardingStore();

  useEffect(() => {
    if (!draft.language) {
      const deviceLang = getLocales()[0]?.languageCode ?? 'en';
      const match = LANGUAGES.find((l) => l.code === deviceLang);
      setLanguage(match?.code ?? 'en');
    }
  }, []);

  function handleSelect(code: string) {
    setLanguage(code);
  }

  function handleContinue() {
    setStep('consent');
    router.push('/onboarding/consent');
  }

  function handleBack() {
    router.back();
  }

  return (
    <OnboardingScreen
      title="Dil Seçimi"
      subtitle="Uygulamayı hangi dilde kullanmak istersin?"
      primaryLabel="Devam"
      onPrimary={handleContinue}
      primaryDisabled={!draft.language}
      secondaryLabel="Geri"
      onSecondary={handleBack}
      step={1}
      totalSteps={6}
    >
      <View style={styles.list}>
        {LANGUAGES.map((lang) => {
          const selected = draft.language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {lang.label}
              </Text>
              {selected && <View style={styles.check} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING.SM, paddingTop: SPACING.SM },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.MD,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceSelected },
  optionLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textPrimary, fontWeight: '500' },
  optionLabelSelected: { color: COLORS.primary, fontWeight: '600' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
});
