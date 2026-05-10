import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';
import {
  type EmergencyContact,
  type FamilyConnection,
  usePrivacyStore,
} from '@/store/privacy';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatConnectedDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
  ];
  return `Bağlandı: ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isCaregiverCodeActive(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onValueChange,
  disabled,
}: {
  icon: string;
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconWrap}>
        <Ionicons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.background}
      />
    </View>
  );
}

type InviteStatus = EmergencyContact['invite_status'];

const INVITE_LABELS: Record<InviteStatus, string> = {
  pending: 'Davet Bekleniyor',
  app_user: 'Uygulama Kullanıcısı',
  phone_only: 'Yalnızca Telefon',
  pending_verification: 'Doğrulama Bekliyor',
};

const INVITE_BG: Record<InviteStatus, string> = {
  pending: '#FEF3C7',
  app_user: '#DCFCE7',
  phone_only: COLORS.surface,
  pending_verification: COLORS.warningLight,
};

const INVITE_TEXT: Record<InviteStatus, string> = {
  pending: '#92400E',
  app_user: '#166534',
  phone_only: COLORS.textSecondary,
  pending_verification: '#9A3412',
};

function InviteChip({ status }: { status: InviteStatus }) {
  return (
    <View style={[styles.chip, { backgroundColor: INVITE_BG[status] }]}>
      <Text style={[styles.chipText, { color: INVITE_TEXT[status] }]}>
        {INVITE_LABELS[status]}
      </Text>
    </View>
  );
}

function ECRow({
  ec,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  ec: EmergencyContact;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const priority = index + 1;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <View style={styles.ecRow}>
      <View style={[styles.priorityBadge, isFirst ? styles.priorityBadgePrimary : styles.priorityBadgeSecondary]}>
        <Text style={[styles.priorityText, { color: isFirst ? COLORS.background : COLORS.textSecondary }]}>
          {priority}.
        </Text>
      </View>

      <View style={styles.ecInfo}>
        <Text style={styles.ecName}>{ec.name}</Text>
        <Text style={styles.ecRelationship}>{ec.relationship}</Text>
        <InviteChip status={ec.invite_status} />
      </View>

      <View style={styles.ecActions}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={isFirst}
          style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="chevron-up"
            size={18}
            color={isFirst ? COLORS.textDisabled : COLORS.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={isLast}
          style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="chevron-down"
            size={18}
            color={isLast ? COLORS.textDisabled : COLORS.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddECModal({
  visible,
  saving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (name: string, relationship: string, phone: string) => void;
}) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  function reset() {
    setName('');
    setRelationship('');
    setPhone('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    const n = name.trim();
    const r = relationship.trim();
    const p = phone.trim();
    if (!n || !r || !p) {
      Alert.alert('Eksik Alan', 'Lütfen tüm alanları doldurun.');
      return;
    }
    onSubmit(n, r, p);
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Acil Kişi Ekle</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Örn: Ayşe Yılmaz"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>İlişki</Text>
            <TextInput
              style={styles.textInput}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Örn: Eş, Çocuk, Kardeş"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+90 5xx xxx xx xx"
              placeholderTextColor={COLORS.textDisabled}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Davet Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FamilyRow({
  fc,
  onDisconnect,
}: {
  fc: FamilyConnection;
  onDisconnect: () => void;
}) {
  return (
    <View style={styles.familyRow}>
      <View style={styles.familyIconWrap}>
        <Ionicons name="people-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.familyInfo}>
        <Text style={styles.familyName}>{fc.family_name}</Text>
        <Text style={styles.familyRelationship}>{fc.relationship}</Text>
        <Text style={styles.familyDate}>{formatConnectedDate(fc.connected_at)}</Text>
      </View>
      <TouchableOpacity
        onPress={onDisconnect}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.disconnectBtn}
      >
        <Ionicons name="close-circle-outline" size={22} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const {
    emergencyContacts,
    caregiverLink,
    familyConnections,
    preferences,
    loading,
    saving,
    loadPrivacyData,
    addEmergencyContact,
    removeEmergencyContact,
    reorderEmergencyContacts,
    generateCaregiverCode,
    unlinkCaregiver,
    disconnectFamily,
    updatePreferences,
  } = usePrivacyStore();

  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const sortedECs = [...emergencyContacts].sort((a, b) => a.sort_order - b.sort_order);

  function handleReorder(index: number, direction: 'up' | 'down') {
    const arr = [...sortedECs];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
    reorderEmergencyContacts(arr.map((ec) => ec.ec_id));
  }

  function handleRemoveEC(ec: EmergencyContact) {
    Alert.alert(
      'Acil Kişiyi Kaldır',
      `${ec.name} kişisini acil listesinden kaldırmak istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => removeEmergencyContact(ec.ec_id),
        },
      ],
    );
  }

  async function handleAddEC(name: string, relationship: string, phone: string) {
    try {
      await addEmergencyContact({ name, relationship, phone });
      setAddModalVisible(false);
    } catch {
      Alert.alert('Hata', 'Acil kişi eklenirken bir sorun oluştu.');
    }
  }

  function handleSOSToggle(val: boolean) {
    if (!val) {
      Alert.alert(
        'SOS Sesli Uyarı',
        'SOS sesli uyarıyı kapatmak güvenlik riskine yol açabilir. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Kapat',
            style: 'destructive',
            onPress: () => updatePreferences({ sos_audio_enabled: false }),
          },
        ],
      );
    } else {
      updatePreferences({ sos_audio_enabled: true });
    }
  }

  function handleUnlinkCaregiver() {
    Alert.alert(
      'Bakıcı Bağlantısını Kes',
      'Bakıcınızla bağlantı kesilecek. Devam etmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı Kes',
          style: 'destructive',
          onPress: () => unlinkCaregiver(),
        },
      ],
    );
  }

  function handleDisconnectFamily(fc: FamilyConnection) {
    Alert.alert(
      'Aile Bağlantısını Kes',
      'Bu kişiyle bağlantı kesilecek. Devam?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı Kes',
          style: 'destructive',
          onPress: () => disconnectFamily(fc.connection_id),
        },
      ],
    );
  }

  const hasData = emergencyContacts.length > 0 || caregiverLink !== null || familyConnections.length > 0;

  if (loading && !hasData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const caregiverLinked = caregiverLink?.status === 'linked';
  const caregiverHasActiveCode =
    caregiverLink != null &&
    caregiverLink.status !== 'linked' &&
    isCaregiverCodeActive(caregiverLink.expires_at);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Wakeword & Mikrofon ─────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Wakeword & Mikrofon" />

          <View style={styles.card}>
            <ToggleRow
              icon="mic-outline"
              label="Uyandırma Kelimesi — Sina"
              sub="Cihaz bekleme modundayken 'Sina' diyerek uyandır"
              value={preferences.wakeword_enabled}
              onValueChange={(val) => updatePreferences({ wakeword_enabled: val })}
            />

            {preferences.wakeword_enabled && (
              <View style={styles.infoCard}>
                <Ionicons name="mic-outline" size={16} color={COLORS.primary} />
                <Text style={styles.infoCardText}>
                  Ses veriniz yalnızca cihazınızda işlenir, sunucuya gönderilmez.
                </Text>
              </View>
            )}

            <View style={styles.cardDivider} />

            <ToggleRow
              icon="volume-high-outline"
              label="SOS Sesli Uyarı"
              sub="SOS başlatıldığında sesli alarm çalar"
              value={preferences.sos_audio_enabled}
              onValueChange={handleSOSToggle}
            />
          </View>
        </View>

        {/* ── Section 2: Acil Kişiler ─────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            title="Acil Kişiler"
            right={
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{sortedECs.length}/3</Text>
              </View>
            }
          />

          <View style={styles.card}>
            {sortedECs.length === 0 ? (
              <Text style={styles.emptyText}>Henüz acil kişi eklenmedi.</Text>
            ) : (
              sortedECs.map((ec, index) => (
                <View key={ec.ec_id}>
                  {index > 0 && <View style={styles.cardDivider} />}
                  <ECRow
                    ec={ec}
                    index={index}
                    total={sortedECs.length}
                    onMoveUp={() => handleReorder(index, 'up')}
                    onMoveDown={() => handleReorder(index, 'down')}
                    onRemove={() => handleRemoveEC(ec)}
                  />
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.addECBtn, sortedECs.length >= 3 && styles.addECBtnDisabled]}
            onPress={() => setAddModalVisible(true)}
            disabled={sortedECs.length >= 3}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={sortedECs.length >= 3 ? COLORS.textDisabled : COLORS.primary}
            />
            <Text style={[styles.addECBtnText, sortedECs.length >= 3 && styles.addECBtnTextDisabled]}>
              + Acil Kişi Ekle
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 3: Bakıcı Bağlantısı ───────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Bakıcı Bağlantısı" />

          <View style={styles.card}>
            {caregiverLinked ? (
              <View style={styles.caregiverLinkedRow}>
                <View style={styles.caregiverLinkedInfo}>
                  <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                  <View>
                    <Text style={styles.caregiverName}>{caregiverLink!.caregiver_name}</Text>
                    <View style={styles.linkedChipRow}>
                      <View style={[styles.chip, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.chipText, { color: '#166534' }]}>Bağlı</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={handleUnlinkCaregiver}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unlinkBtnText}>Bağlantıyı Kes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.caregiverAddCard}>
                <Text style={styles.caregiverAddTitle}>Bakıcı Ekle</Text>

                {caregiverHasActiveCode ? (
                  <>
                    <Text style={styles.caregiverCode}>{caregiverLink!.link_code}</Text>
                    <Text style={styles.caregiverCodeSub}>
                      Bakıcınıza bu kodu verin veya QR kodu taratın
                    </Text>
                    <Text style={styles.caregiverExpiry}>Kod 15 dakika geçerli</Text>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => generateCaregiverCode()}
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                      {saving ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Text style={styles.secondaryBtnText}>Yeni Kod Oluştur</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                    onPress={() => generateCaregiverCode()}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.background} size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Kod Oluştur</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Section 4: Bağlı Aile Üyeleri ──────────────────────────── */}
        <View style={[styles.section, styles.sectionLast]}>
          <SectionHeader title="Bağlı Aile Üyeleri" />

          <View style={styles.card}>
            {familyConnections.length === 0 ? (
              <Text style={styles.emptyText}>Henüz bağlı aile üyesi yok.</Text>
            ) : (
              familyConnections.map((fc, index) => (
                <View key={fc.connection_id}>
                  {index > 0 && <View style={styles.cardDivider} />}
                  <FamilyRow fc={fc} onDisconnect={() => handleDisconnectFamily(fc)} />
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AddECModal
        visible={addModalVisible}
        saving={saving}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddEC}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },

  section: { marginBottom: SPACING.LG },
  sectionLast: { marginBottom: 0 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.XS,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: -SPACING.SM,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    gap: SPACING.MD,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: { flex: 1 },
  toggleLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.SM,
    backgroundColor: COLORS.surfaceSelected,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
  },
  infoCardText: {
    flex: 1,
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.primary,
    lineHeight: 18,
  },

  // Count badge
  countBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // EC rows
  ecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  priorityBadgePrimary: { backgroundColor: COLORS.primary },
  priorityBadgeSecondary: { backgroundColor: COLORS.border },
  priorityText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
  },
  ecInfo: { flex: 1, gap: 2 },
  ecName: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ecRelationship: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
  },
  ecActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  reorderBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtnDisabled: { opacity: 0.3 },

  // Status chips
  chip: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    marginTop: 2,
  },
  chipText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
  },

  // Add EC button
  addECBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
    borderStyle: 'dashed',
  },
  addECBtnDisabled: {
    borderColor: COLORS.textDisabled,
  },
  addECBtnText: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addECBtnTextDisabled: {
    color: COLORS.textDisabled,
  },

  // Caregiver section
  caregiverLinkedRow: {
    gap: SPACING.MD,
  },
  caregiverLinkedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  caregiverName: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  linkedChipRow: {
    marginTop: 2,
  },
  unlinkBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  unlinkBtnText: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.error,
  },

  caregiverAddCard: {
    alignItems: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.SM,
  },
  caregiverAddTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  caregiverCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: FONT_SIZE.H1,
    fontWeight: '700',
    letterSpacing: 8,
    color: COLORS.primary,
    marginVertical: SPACING.SM,
  },
  caregiverCodeSub: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  caregiverExpiry: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    alignSelf: 'stretch',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.BUTTON,
    fontWeight: '700',
    color: COLORS.background,
  },

  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    alignSelf: 'stretch',
  },
  secondaryBtnText: {
    fontSize: FONT_SIZE.BUTTON,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Family rows
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  familyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  familyInfo: { flex: 1 },
  familyName: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  familyRelationship: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  familyDate: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    marginTop: 1,
  },
  disconnectBtn: {
    width: TOUCH_TARGET.MINIMUM,
    height: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.MD,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalBody: {
    flex: 1,
    padding: SPACING.MD,
    gap: SPACING.MD,
  },
  modalFooter: {
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fieldGroup: { gap: SPACING.XS },
  fieldLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    paddingHorizontal: SPACING.MD,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
});
