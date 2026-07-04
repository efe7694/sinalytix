import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '@/store/profile';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

type EditingField = 'name' | 'email' | null;

export default function AccountScreen() {
  const { profile, loading, saving, loadProfile, updateProfile, requestDataExport, requestAccountDeletion } =
    useProfileStore();

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [nameValue, setNameValue] = useState('');
  const [emailValue, setEmailValue] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setNameValue(profile.display_name ?? '');
      setEmailValue(profile.email ?? '');
    }
  }, [profile]);

  function startEdit(field: EditingField) {
    if (profile) {
      setNameValue(profile.display_name ?? '');
      setEmailValue(profile.email ?? '');
    }
    setEditingField(field);
  }

  function cancelEdit() {
    if (profile) {
      setNameValue(profile.display_name ?? '');
      setEmailValue(profile.email ?? '');
    }
    setEditingField(null);
  }

  async function saveEdit() {
    if (!editingField) return;
    const patch = editingField === 'name'
      ? { display_name: nameValue.trim() }
      : { email: emailValue.trim() };
    await updateProfile(patch);
    setEditingField(null);
  }

  async function handleDataExport() {
    await requestDataExport();
    Alert.alert(
      'Dışa Aktarma Başlatıldı',
      'Hazır olduğunda e-posta ile gönderilecek. (72 saat geçerli)',
    );
  }

  function confirmDeleteStep1() {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz?\n\nTüm verileriniz 30 gün sonra kalıcı olarak silinir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Devam Et', style: 'destructive', onPress: () => setDeleteModalVisible(true) },
      ],
    );
  }

  async function confirmDeleteFinal() {
    await requestAccountDeletion();
    setDeleteModalVisible(false);
    setDeleteConfirmText('');
    Alert.alert('Talep Alındı', 'Silme talebiniz alındı. 30 gün içinde işlenecektir.');
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isEditing = editingField !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Profil Bilgileri */}
        <Text style={styles.sectionHeader}>Profil Bilgileri</Text>
        <View style={styles.card}>

          {/* Ad Soyad */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldMeta}>
              <Text style={styles.fieldLabel}>Ad Soyad</Text>
              {editingField === 'name' ? (
                <TextInput
                  style={styles.fieldInput}
                  value={nameValue}
                  onChangeText={setNameValue}
                  autoFocus
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
                  placeholderTextColor={COLORS.textDisabled}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.display_name ?? '—'}</Text>
              )}
            </View>
            {editingField !== 'name' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => startEdit('name')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Telefon — non-editable */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldMeta}>
              <Text style={styles.fieldLabel}>Telefon</Text>
              <Text style={[styles.fieldValue, styles.fieldValueDisabled]}>
                {profile?.phone ?? '—'}
              </Text>
              <Text style={styles.fieldHint}>
                Telefon değiştirmek için destek ekibiyle iletişime geç.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* E-posta */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldMeta}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              {editingField === 'email' ? (
                <TextInput
                  style={styles.fieldInput}
                  value={emailValue}
                  onChangeText={setEmailValue}
                  autoFocus
                  editable={!saving}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
                  placeholderTextColor={COLORS.textDisabled}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.email ?? '—'}</Text>
              )}
            </View>
            {editingField !== 'email' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => startEdit('email')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editBtn, styles.editBtnCancel]}
              onPress={cancelEdit}
              disabled={saving}
            >
              <Text style={styles.editBtnCancelLabel}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, styles.editBtnSave, saving && styles.editBtnDisabled]}
              onPress={saveEdit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.editBtnSaveLabel}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Section 2: Dil */}
        <Text style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>Uygulama Dili</Text>
        <View style={styles.card}>
          <View style={styles.segmented}>
            {(['tr', 'en'] as const).map((locale) => {
              const isActive = (profile?.locale ?? 'tr') === locale;
              return (
                <TouchableOpacity
                  key={locale}
                  style={[styles.segBtn, isActive && styles.segBtnActive]}
                  onPress={() => updateProfile({ locale })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>
                    {locale === 'tr' ? 'Türkçe' : 'English'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Veri Export */}
        <Text style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>Veri</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowBtn}
            onPress={handleDataExport}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.rowBtnLabel}>Verilerimi İndir</Text>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.rowBtnTrailing} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} style={styles.rowBtnTrailing} />
            )}
          </TouchableOpacity>
        </View>

        {/* Section 4: Tehlikeli Bölge */}
        <Text style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>Tehlikeli Bölge</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={confirmDeleteStep1}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.dangerBtnLabel}>Hesabımı Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeleteConfirmText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Kalıcı Silme Onayı</Text>
            <Text style={styles.modalInstruction}>"SİL" yazarak onaylayın</Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoFocus
              autoCapitalize="characters"
              maxLength={3}
              placeholder="SİL"
              placeholderTextColor={COLORS.textDisabled}
            />
            <TouchableOpacity
              style={[
                styles.modalDeleteBtn,
                deleteConfirmText.trim() !== 'SİL' && styles.modalDeleteBtnDisabled,
              ]}
              onPress={confirmDeleteFinal}
              disabled={deleteConfirmText.trim() !== 'SİL' || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalDeleteBtnLabel}>Kalıcı Olarak Sil</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelLink}
              onPress={() => {
                setDeleteModalVisible(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={styles.modalCancelLinkLabel}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingVertical: SPACING.LG, paddingBottom: SPACING.XL },

  sectionHeader: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.LG,
  },
  sectionHeaderSpaced: { marginTop: SPACING.XL },

  card: {
    marginHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface ?? COLORS.background,
    overflow: 'hidden',
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
  },
  fieldMeta: { flex: 1, gap: SPACING.XS },
  fieldLabel: { fontSize: FONT_SIZE.CAPTION, fontWeight: '600', color: COLORS.textSecondary },
  fieldValue: { fontSize: FONT_SIZE.BODY, color: COLORS.textPrimary },
  fieldValueDisabled: { color: COLORS.textDisabled },
  fieldHint: { fontSize: FONT_SIZE.CAPTION, color: COLORS.textDisabled, marginTop: 2 },
  fieldInput: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: 32,
  },
  iconBtn: { paddingLeft: SPACING.SM, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.MD },

  editActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  editBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnCancel: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  editBtnSave: { backgroundColor: COLORS.primary },
  editBtnDisabled: { opacity: 0.6 },
  editBtnCancelLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '600', color: COLORS.textSecondary },
  editBtnSaveLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '700', color: '#FFF' },

  segmented: {
    flexDirection: 'row',
    margin: SPACING.MD,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  segBtnActive: { backgroundColor: COLORS.primary },
  segLabel: { fontSize: FONT_SIZE.CAPTION, fontWeight: '600', color: COLORS.textSecondary },
  segLabelActive: { color: '#FFF' },

  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
    minHeight: TOUCH_TARGET.PREFERRED,
  },
  rowBtnLabel: { flex: 1, fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.primary },
  rowBtnTrailing: { marginLeft: 'auto' },

  dangerCard: { borderColor: COLORS.error + '55' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
    minHeight: TOUCH_TARGET.PREFERRED,
    backgroundColor: COLORS.error + '0D',
  },
  dangerBtnLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.error },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  modalSheet: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalInstruction: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: TOUCH_TARGET.PREFERRED,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDeleteBtnDisabled: { opacity: 0.4 },
  modalDeleteBtnLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '700', color: '#FFF' },
  modalCancelLink: { alignItems: 'center', paddingVertical: SPACING.SM },
  modalCancelLinkLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary, fontWeight: '600' },
});
