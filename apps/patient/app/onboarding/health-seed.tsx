import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CONDITION_CATALOG, UNKNOWN_CONDITION_ID } from '@sinalytix/shared';
import { useOnboardingStore, type AllergyFlag } from '@/store/onboarding';
import OnboardingScreen from '@/components/OnboardingScreen';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

type Page = 'conditions' | 'allergy';

export default function HealthSeedScreen() {
  const router = useRouter();
  const { draft, setHealthSeed, setStep } = useOnboardingStore();

  const [page, setPage] = useState<Page>('conditions');
  const [conditions, setConditions] = useState<string[]>(
    draft.health_seed?.conditions ?? []
  );
  const [allergyFlag, setAllergyFlag] = useState<AllergyFlag | null>(
    draft.health_seed?.allergy_flag ?? null
  );
  const [allergyNotes, setAllergyNotes] = useState(
    draft.health_seed?.allergy_notes ?? ''
  );

  const regularConditions = CONDITION_CATALOG.filter((c) => c.id !== UNKNOWN_CONDITION_ID);
  const unknownOption = CONDITION_CATALOG.find((c) => c.id === UNKNOWN_CONDITION_ID)!;

  function toggleCondition(id: string) {
    if (id === UNKNOWN_CONDITION_ID) {
      setConditions([UNKNOWN_CONDITION_ID]);
      return;
    }
    setConditions((prev) => {
      const withoutUnknown = prev.filter((c) => c !== UNKNOWN_CONDITION_ID);
      return withoutUnknown.includes(id)
        ? withoutUnknown.filter((c) => c !== id)
        : [...withoutUnknown, id];
    });
  }

  const conditionsValid = conditions.length > 0;
  const allergyValid = allergyFlag !== null;

  function handleConditionsContinue() {
    setHealthSeed({ conditions });
    setPage('allergy');
  }

  function handleAllergyContinue() {
    setHealthSeed({
      conditions,
      allergy_flag: allergyFlag!,
      allergy_notes: allergyFlag === 'yes' ? allergyNotes.trim() || null : null,
    });
    setStep('auth_method');
    router.push('/onboarding/auth-method');
  }

  if (page === 'conditions') {
    return (
      <OnboardingScreen
        title="Sağlık Profili"
        subtitle="Sağlık durumunla ilgili uygun olanları seç. Bu bilgi bakım akışını kişiselleştirir."
        primaryLabel="Devam"
        onPrimary={handleConditionsContinue}
        primaryDisabled={!conditionsValid}
        secondaryLabel="Geri"
        onSecondary={() => router.back()}
        step={4}
        totalSteps={6}
        scrollable
      >
        <View style={styles.grid}>
          {regularConditions.map((cond) => {
            const selected = conditions.includes(cond.id);
            return (
              <TouchableOpacity
                key={cond.id}
                style={[styles.condOption, selected && styles.condOptionSelected]}
                onPress={() => toggleCondition(cond.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.condCheck, selected && styles.condCheckSelected]}>
                  {selected && <Text style={styles.condCheckTick}>✓</Text>}
                </View>
                <Text style={[styles.condLabel, selected && styles.condLabelSelected]}>
                  {cond.labelTr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.unknownRow, conditions.includes(UNKNOWN_CONDITION_ID) && styles.unknownRowSelected]}
          onPress={() => toggleCondition(UNKNOWN_CONDITION_ID)}
          activeOpacity={0.7}
        >
          <View style={[styles.condCheck, conditions.includes(UNKNOWN_CONDITION_ID) && styles.condCheckSelected]}>
            {conditions.includes(UNKNOWN_CONDITION_ID) && <Text style={styles.condCheckTick}>✓</Text>}
          </View>
          <Text style={styles.unknownLabel}>{unknownOption.labelTr}</Text>
        </TouchableOpacity>
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen
      title="Alerjiler"
      subtitle="Bilinen alerjin var mı?"
      primaryLabel="Devam"
      onPrimary={handleAllergyContinue}
      primaryDisabled={!allergyValid}
      secondaryLabel="Geri"
      onSecondary={() => setPage('conditions')}
      step={4}
      totalSteps={6}
      scrollable
    >
      <View style={styles.allergyOptions}>
        {(['yes', 'no', 'unknown'] as AllergyFlag[]).map((flag) => {
          const labels: Record<AllergyFlag, string> = {
            yes: 'Evet',
            no: 'Hayır',
            unknown: 'Bilmiyorum',
          };
          return (
            <TouchableOpacity
              key={flag}
              style={[styles.allergyBtn, allergyFlag === flag && styles.allergyBtnSelected]}
              onPress={() => setAllergyFlag(flag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.allergyBtnLabel, allergyFlag === flag && styles.allergyBtnLabelSelected]}>
                {labels[flag]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {allergyFlag === 'yes' && (
        <View style={styles.notesField}>
          <Text style={styles.notesLabel}>Hangi alerjilerin var? (ilaç, besin, diğer)</Text>
          <TextInput
            style={styles.notesInput}
            value={allergyNotes}
            onChangeText={setAllergyNotes}
            placeholder="Örn: Penisilin, fıstık"
            placeholderTextColor={COLORS.textDisabled}
            multiline
            numberOfLines={3}
          />
        </View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
    marginBottom: SPACING.MD,
  },
  condOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    width: '47%',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.SM,
    minHeight: TOUCH_TARGET.MINIMUM,
  },
  condOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceSelected },
  condCheck: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  condCheckSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  condCheckTick: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  condLabel: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  condLabelSelected: { color: COLORS.primary, fontWeight: '600' },
  unknownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    backgroundColor: COLORS.surface,
  },
  unknownRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceSelected },
  unknownLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary, flex: 1 },
  allergyOptions: { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.LG },
  allergyBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allergyBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceSelected },
  allergyBtnLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary, fontWeight: '500' },
  allergyBtnLabelSelected: { color: COLORS.primary, fontWeight: '700' },
  notesField: { gap: SPACING.XS },
  notesLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  notesInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
