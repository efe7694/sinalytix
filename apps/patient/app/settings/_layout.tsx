import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

type TabKey = 'account' | 'health' | 'notifications' | 'privacy';

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: 'account', label: 'Hesabım', path: '/settings' },
  { key: 'health', label: 'Sağlık Profilim', path: '/settings/health' },
  { key: 'notifications', label: 'Bildirimler', path: '/settings/notifications' },
  { key: 'privacy', label: 'Gizlilik & Güvenlik', path: '/settings/privacy' },
];

function resolveActiveTab(pathname: string): TabKey {
  if (pathname === '/settings' || pathname === '/settings/') return 'account';
  if (pathname.startsWith('/settings/health')) return 'health';
  if (pathname.startsWith('/settings/notifications')) return 'notifications';
  if (pathname.startsWith('/settings/privacy')) return 'privacy';
  return 'account';
}

export default function SettingsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => router.replace(tab.path as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.tabBarBorder} />
      </View>

      <Slot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    height: TOUCH_TARGET.PREFERRED,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  tabBarWrapper: { position: 'relative' },
  tabBarContent: { paddingHorizontal: SPACING.LG, gap: 0 },
  tabBarBorder: {
    height: 1,
    backgroundColor: COLORS.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: { color: COLORS.primary },
});
