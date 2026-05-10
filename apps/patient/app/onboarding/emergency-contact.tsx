import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore, type EmergencyContactDraft } from '@/store/onboarding';
import OnboardingScreen from '@/components/OnboardingScreen';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '@sinalytix/ui';

const RELATIONSHIPS = ['Eş', 'Çocuk', 'Kardeş', 'Arkadaş', 'Diğer'];

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw;
}

function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+1\d{10}$/.test(normalized);
}

export default function EmergencyContactScreen() {
  const router = useRouter();
  const { draft, setEmergencyContact, setStep } = useOnboardingStore();
  const existing = draft.emergency_contact;

  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [phoneError, setPhoneError] = useState('');

  const canContinue =
    name.trim().length > 0 &&
    relationship.trim().length > 0 &&
    phone.trim().length > 0 &&
    isValidPhone(phone);

  function handlePhoneChange(text: string) {
    setPhone(text);
    if (text.length > 4 && !isValidPhone(text)) {
      setPhoneError('Geçerli bir Kanada/ABD numarası girin (+1 XXX XXX XXXX)');
    } else {
      setPhoneError('');
    }
  }

  function handleContinue() {
    const ec: EmergencyContactDraft = {
      name: name.trim(),
      relationship: relationship.trim(),
      phone: normalizePhone(phone),
      verified: false,
    };
    setEmergencyContact(ec);
    setStep('seed');
    router.push('/onboarding/health-seed');
  }

  return (
    <OnboardingScreen
      title="Acil İletişim Kişisi"
      subtitle="Acil durumda aranacak kişinin bilgilerini gir."
      primaryLabel="Kaydet ve Devam"
      onPrimary={handleContinue}
      primaryDisabled={!canContinue}
      secondaryLabel="Geri"
      onSecondary={() => router.back()}
      step={3}
      totalSteps={6}
      scrollable
    >
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ad Soyad"
            placeholderTextColor={COLORS.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Yakınlık</Text>
          <View style={styles.pills}>
            {RELATIONSHIPS.map((r) => (
              <RelPill
                key={r}
                label={r}
                selected={relationship === r}
                onPress={() => setRelationship(r)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefon Numarası</Text>
          <TextInput
            style={[styles.input, phoneError ? styles.inputError : null]}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="+1 (416) 555 0100"
            placeholderTextColor={COLORS.textDisabled}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Acil kişinin numarasını daha sonra profilinden doğrulayabilirsin.
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

function RelPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity
      style={[pillStyles.pill, selected && pillStyles.pillSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[pillStyles.label, selected && pillStyles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.LG },
  field: { gap: SPACING.XS },
  label: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM + 4,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: 52,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: FONT_SIZE.CAPTION, color: COLORS.error, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.XS },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  bannerText: { fontSize: FONT_SIZE.CAPTION + 1, color: COLORS.textSecondary, lineHeight: 20 },
});

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS + 2,
    borderRadius: BORDER_RADIUS.FULL,
    borderWidth: 2,
    borderColor: COLORS.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  pillSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceSelected },
  label: { fontSize: FONT_SIZE.CAPTION + 1, color: COLORS.textSecondary, fontWeight: '500' },
  labelSelected: { color: COLORS.primary, fontWeight: '600' },
});
