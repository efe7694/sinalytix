import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGY_CATALOG, CONDITION_CATALOG, UNKNOWN_CONDITION_ID } from '@sinalytix/shared';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';
import { useHealthStore } from '@/store/health';

type ActiveModal = 'conditions' | 'allergies' | 'add_medication' | null;

export default function HealthScreen() {
  const {
    profile,
    loading,
    saving,
    loadHealthProfile,
    updateConditions,
    updateAllergies,
    addMedication,
    archiveMedication,
    activeMedications,
  } = useHealthStore();

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergyNotes, setAllergyNotes] = useState('');

  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medStartDate, setMedStartDate] = useState('');

  useEffect(() => {
    loadHealthProfile();
  }, []);

  function openConditionsModal() {
    setSelectedConditions(profile?.conditions ?? []);
    setActiveModal('conditions');
  }

  function openAllergiesModal() {
    setSelectedAllergies(profile?.allergies ?? []);
    setAllergyNotes(profile?.allergy_notes ?? '');
    setActiveModal('allergies');
  }

  function openAddMedicationModal() {
    setMedName('');
    setMedDose('');
    setMedFrequency('');
    setMedStartDate('');
    setActiveModal('add_medication');
  }

  function toggleCondition(id: string) {
    if (id === UNKNOWN_CONDITION_ID) {
      setSelectedConditions([UNKNOWN_CONDITION_ID]);
      return;
    }
    setSelectedConditions((prev) => {
      const withoutUnknown = prev.filter((c) => c !== UNKNOWN_CONDITION_ID);
      return withoutUnknown.includes(id)
        ? withoutUnknown.filter((c) => c !== id)
        : [...withoutUnknown, id];
    });
  }

  function toggleAllergy(id: string) {
    setSelectedAllergies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  async function handleSaveConditions() {
    await updateConditions(selectedConditions);
    setActiveModal(null);
  }

  async function handleSaveAllergies() {
    await updateAllergies(selectedAllergies, allergyNotes.trim() || null);
    setActiveModal(null);
  }

  async function handleAddMedication() {
    if (!medName.trim()) return;
    await addMedication({
      name: medName.trim(),
      dose: medDose.trim() || undefined,
      frequency: medFrequency.trim() || undefined,
      start_date: medStartDate.trim() || undefined,
    });
    setActiveModal(null);
  }

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const meds = activeMedications();
  const regularConditions = CONDITION_CATALOG.filter((c) => c.id !== UNKNOWN_CONDITION_ID);
  const unknownOption = CONDITION_CATALOG.find((c) => c.id === UNKNOWN_CONDITION_ID)!;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section
          title="Hastalıklar"
          onEdit={openConditionsModal}
        >
          <ChipRow ids={profile?.conditions ?? []} catalog={CONDITION_CATALOG} />
        </Section>

        <Section
          title="Alerjiler"
          onEdit={openAllergiesModal}
        >
          <ChipRow ids={profile?.allergies ?? []} catalog={ALLERGY_CATALOG} />
          {!!profile?.allergy_notes && (
            <Text style={styles.allergyNotesText}>{profile.allergy_notes}</Text>
          )}
        </Section>

        <Section title="İlaçlar">
          {meds.length === 0 ? (
            <Text style={styles.emptyText}>Belirtilmedi</Text>
          ) : (
            meds.map((med) => (
              <View key={med.medication_id} style={styles.medRow}>
                <Ionicons
                  name="medical-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.medIcon}
                />
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  {(med.dose || med.frequency) && (
                    <Text style={styles.medMeta}>
                      {[med.dose, med.frequency].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => archiveMedication(med.medication_id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.archiveBtn}
                >
                  <Ionicons name="archive-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addMedBtn} onPress={openAddMedicationModal} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addMedBtnLabel}>+ İlaç Ekle</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Sağlık Kayıtları">
          <View style={styles.placeholderCard}>
            <Ionicons name="medical-outline" size={32} color={COLORS.primary} />
            <Text style={styles.placeholderTitle}>Belge Yükleme</Text>
            <Text style={styles.placeholderSub}>
              Bir sonraki güncellemede kullanılabilir olacak
            </Text>
          </View>
        </Section>
      </ScrollView>

      <Modal visible={activeModal === 'conditions'} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ModalHeader title="Hastalıklar" onClose={() => setActiveModal(null)} />
          <FlatList
            data={regularConditions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => {
              const checked = selectedConditions.includes(item.id);
              return (
                <CheckRow
                  label={item.labelTr}
                  checked={checked}
                  onPress={() => toggleCondition(item.id)}
                />
              );
            }}
            ListFooterComponent={
              <CheckRow
                label={unknownOption.labelTr}
                checked={selectedConditions.includes(UNKNOWN_CONDITION_ID)}
                onPress={() => toggleCondition(UNKNOWN_CONDITION_ID)}
                unknown
              />
            }
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveConditions}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnLabel}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={activeModal === 'allergies'} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ModalHeader title="Alerjiler" onClose={() => setActiveModal(null)} />
          <FlatList
            data={ALLERGY_CATALOG}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => {
              const checked = selectedAllergies.includes(item.id);
              return (
                <CheckRow
                  label={item.labelTr}
                  checked={checked}
                  onPress={() => toggleAllergy(item.id)}
                />
              );
            }}
            ListFooterComponent={
              <View style={styles.notesField}>
                <Text style={styles.notesLabel}>Ek notlar (ör. reaksiyon türü)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={allergyNotes}
                  onChangeText={setAllergyNotes}
                  placeholder="Ek notlar (ör. reaksiyon türü)"
                  placeholderTextColor={COLORS.textDisabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            }
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveAllergies}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnLabel}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={activeModal === 'add_medication'} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ModalHeader title="İlaç Ekle" onClose={() => setActiveModal(null)} />
          <ScrollView contentContainerStyle={styles.modalFormContent}>
            <MedInput label="İlaç Adı *" value={medName} onChangeText={setMedName} placeholder="Örn: Metformin" />
            <MedInput label="Doz" value={medDose} onChangeText={setMedDose} placeholder="Örn: 500 mg" />
            <MedInput label="Sıklık" value={medFrequency} onChangeText={setMedFrequency} placeholder="Örn: Günde 2 kez" />
            <MedInput label="Başlangıç Tarihi" value={medStartDate} onChangeText={setMedStartDate} placeholder="Örn: 01.01.2024" />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, (!medName.trim() || saving) && styles.saveBtnDisabled]}
              onPress={handleAddMedication}
              disabled={!medName.trim() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnLabel}>Ekle</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.editLabel}>Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function ChipRow({
  ids,
  catalog,
}: {
  ids: string[];
  catalog: { id: string; labelTr: string }[];
}) {
  if (ids.length === 0) {
    return <Text style={styles.emptyText}>Belirtilmedi</Text>;
  }
  return (
    <View style={styles.chipRow}>
      {ids.map((id) => {
        const item = catalog.find((c) => c.id === id);
        if (!item) return null;
        return (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipLabel}>{item.labelTr}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
  unknown,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  unknown?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={checked ? COLORS.primary : COLORS.textDisabled}
      />
      <Text style={[styles.checkLabel, unknown && styles.checkLabelUnknown]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <TouchableOpacity
        onPress={onClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.modalCloseBtn}
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>{title}</Text>
      <View style={styles.modalCloseBtn} />
    </View>
  );
}

function MedInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.medInputWrapper}>
      <Text style={styles.medInputLabel}>{label}</Text>
      <TextInput
        style={styles.medInputField}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.MD, gap: SPACING.MD, paddingBottom: SPACING.XXL },

  section: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.primary,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.XS },
  chip: {
    backgroundColor: COLORS.surfaceSelected,
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  chipLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.primary,
  },

  emptyText: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
  },

  allergyNotesText: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    marginTop: SPACING.XS,
  },

  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET.MINIMUM,
    gap: SPACING.SM,
  },
  medIcon: { flexShrink: 0 },
  medInfo: { flex: 1 },
  medName: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  medMeta: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  archiveBtn: {
    minWidth: TOUCH_TARGET.MINIMUM,
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET.MINIMUM,
    marginTop: SPACING.XS,
  },
  addMedBtnLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.primary,
  },

  placeholderCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.LG,
    alignItems: 'center',
    gap: SPACING.SM,
  },
  placeholderTitle: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholderSub: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    height: TOUCH_TARGET.PREFERRED,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseBtn: { width: 36, alignItems: 'flex-start' },
  modalTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  modalListContent: { paddingVertical: SPACING.XS },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkLabel: {
    flex: 1,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
  },
  checkLabelUnknown: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  notesField: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    gap: SPACING.XS,
  },
  notesLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: 88,
    textAlignVertical: 'top',
  },

  modalFooter: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
    height: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnLabel: {
    fontSize: FONT_SIZE.BUTTON,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalFormContent: {
    padding: SPACING.MD,
    gap: SPACING.MD,
  },
  medInputWrapper: { gap: SPACING.XS },
  medInputLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  medInputField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    height: TOUCH_TARGET.PREFERRED,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
  },
});
