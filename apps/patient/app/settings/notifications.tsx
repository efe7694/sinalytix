import { Linking, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

const CATEGORIES = [
  {
    icon: 'document-text-outline',
    label: 'Günlük Rapor',
    desc: 'Gün sonu görev ve sağlık özeti',
  },
  {
    icon: 'chatbubble-outline',
    label: 'Yeni Mesaj',
    desc: 'Aile ve bakıcıdan gelen mesajlar',
  },
  {
    icon: 'checkmark-circle-outline',
    label: 'Görev Hatırlatıcısı',
    desc: 'Yaklaşan görevler için hatırlatmalar',
  },
  {
    icon: 'person-add-outline',
    label: 'Bakıcı Bağlandı',
    desc: 'Yeni bakıcı bağlantısı kurulduğunda',
  },
  {
    icon: 'person-remove-outline',
    label: 'Bakıcı Bağlantısı Kesildi',
    desc: 'Bakıcı bağlantısı sonlandırıldığında',
  },
  {
    icon: 'alert-circle-outline',
    label: 'Acil Kişi Doğrulama',
    desc: 'Telefon doğrulaması bekleniyor',
  },
  {
    icon: 'pulse-outline',
    label: 'Semptom Raporu Gönderildi',
    desc: 'AI agent semptom bildirimi yaptığında',
  },
];

export default function NotificationsScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Bildirim tercihlerini ayarlamak için cihaz ayarlarını kullanın.
          Sonraki sürümde uygulama içi kontrol eklenecektir.
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Bildirim Kategorileri</Text>

      <View style={styles.list}>
        {CATEGORIES.map((cat, i) => (
          <View
            key={cat.label}
            style={[styles.row, i < CATEGORIES.length - 1 && styles.rowBorder]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={cat.icon as any} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{cat.label}</Text>
              <Text style={styles.rowDesc}>{cat.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.osBtn}
        onPress={() => Linking.openSettings()}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
        <Text style={styles.osBtnLabel}>Cihaz Bildirim Ayarlarını Aç</Text>
        <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.v1Note}>
        V1'de: kategori bazlı toggle + sessiz saatler (SOS bildirimleri her zaman aktif)
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.LG,
    gap: SPACING.LG,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.SM,
    backgroundColor: COLORS.surfaceSelected,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  sectionHeader: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  list: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    gap: SPACING.MD,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowDesc: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
  },

  osBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  osBtnLabel: {
    flex: 1,
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.primary,
  },

  v1Note: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
