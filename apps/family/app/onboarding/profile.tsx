import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore, type Relationship } from '@/store/onboarding';

const BRAND = '#6366F1';

const RELATIONSHIPS: { value: Relationship; label: string; emoji: string }[] = [
  { value: 'spouse', label: 'Eş', emoji: '💑' },
  { value: 'child', label: 'Çocuk', emoji: '👨‍👩‍👧' },
  { value: 'sibling', label: 'Kardeş', emoji: '🤝' },
  { value: 'parent', label: 'Ebeveyn', emoji: '👴' },
  { value: 'other', label: 'Diğer', emoji: '👤' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { draft, setProfile, setStep } = useOnboardingStore();

  const [firstName, setFirstName] = useState(draft.profile.first_name);
  const [lastName, setLastName] = useState(draft.profile.last_name);
  const [relationship, setRelationship] = useState<Relationship | null>(
    draft.profile.relationship,
  );

  const isValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    relationship !== null;

  const handleContinue = async () => {
    if (!isValid) return;
    await setProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      relationship: relationship!,
    });
    await setStep('auth_method');
    router.push('/onboarding/auth-method');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profil Bilgileri</Text>
        <Text style={styles.subtitle}>Hasta ile ilişkinizi belirtin.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Ad</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Adınız"
            autoCapitalize="words"
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Soyad</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Soyadınız"
            autoCapitalize="words"
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Hastayla İlişkiniz</Text>
          <View style={styles.chips}>
            {RELATIONSHIPS.map((rel) => {
              const selected = relationship === rel.value;
              return (
                <TouchableOpacity
                  key={rel.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setRelationship(rel.value)}
                >
                  <Text style={styles.chipEmoji}>{rel.emoji}</Text>
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {rel.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, !isValid && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, gap: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipSelected: { borderColor: BRAND, backgroundColor: '#EEF2FF' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipLabelSelected: { color: BRAND, fontWeight: '600' },
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
