import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '@/store/profile';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, loadProfile } = useProfileStore();

  useEffect(() => {
    loadProfile();
  }, []);

  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Ayarlar"
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
          {profile?.phone && (
            <Text style={styles.sub}>{profile.phone}</Text>
          )}
          {profile?.email && (
            <Text style={styles.sub}>{profile.email}</Text>
          )}

          {/* Settings shortcut cards */}
          <View style={styles.cards}>
            {SHORTCUTS.map(({ icon, label, route }) => (
              <TouchableOpacity
                key={route}
                style={styles.card}
                onPress={() => router.push(route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name={icon as any} size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.cardLabel}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const SHORTCUTS = [
  { icon: 'person-outline', label: 'Hesabım', route: '/settings' },
  { icon: 'medkit-outline', label: 'Sağlık Profilim', route: '/settings/health' },
  { icon: 'notifications-outline', label: 'Bildirimler', route: '/settings/notifications' },
  { icon: 'shield-checkmark-outline', label: 'Gizlilik & Güvenlik', route: '/settings/privacy' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.H2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsBtn: {
    width: TOUCH_TARGET.PREFERRED,
    height: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: {
    flex: 1,
    padding: SPACING.LG,
    alignItems: 'center',
    gap: SPACING.SM,
  },

  avatarWrap: { marginTop: SPACING.LG, marginBottom: SPACING.SM },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },

  name: {
    fontSize: FONT_SIZE.H2,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  sub: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  cards: {
    width: '100%',
    marginTop: SPACING.LG,
    gap: SPACING.SM,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    gap: SPACING.MD,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
