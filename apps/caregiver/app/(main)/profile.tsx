import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';

const ROLE_LABELS: Record<string, string> = {
  psw: 'Personal Support Worker (PSW)',
  hca: 'Home Care Aide (HCA)',
  rpn: 'Registered Practical Nurse (RPN)',
  rn: 'Registered Nurse (RN)',
  other: 'Diğer',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, logout } = useAuthStore();

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Sinalytix</Text>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {profile.first_name[0]}{profile.last_name[0]}
            </Text>
          </View>
          <Text style={styles.name}>
            {profile.first_name} {profile.last_name}
          </Text>
          {profile.role && (
            <Text style={styles.role}>{ROLE_LABELS[profile.role] ?? profile.role}</Text>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>

          <View style={styles.card}>
            <Row label="Ad" value={profile.first_name} />
            <Row label="Soyad" value={profile.last_name} />
            {profile.phone && <Row label="Telefon" value={profile.phone} />}
            {profile.email && <Row label="E-posta" value={profile.email} />}
            <Row label="Durum" value={profile.status === 'active' ? 'Aktif' : profile.status} />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          <View style={styles.card}>
            <MenuItem
              label="Vardiya Geçmişi"
              emoji="📋"
              onPress={() => router.push('/shift-history')}
            />
            <MenuItem label="Bildirim Ayarları" emoji="🔔" />
            <MenuItem label="Gizlilik" emoji="🔒" />
            <MenuItem label="Yardım" emoji="❓" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Sinalytix teşhis koymaz, tedavi önermez. Bakım koordinasyonu ve görev yönetimi aracıdır.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function MenuItem({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.6}>
      <Text style={menuStyles.emoji}>{emoji}</Text>
      <Text style={menuStyles.label}>{label}</Text>
      <Text style={menuStyles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  logo: { fontSize: 18, fontWeight: '800', color: '#059669' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 8 },
  scroll: { paddingBottom: 48 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#059669' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  role: { fontSize: 14, color: '#6B7280' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  logoutBtn: {
    margin: 16,
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 17,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: { flex: 1, fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, color: '#111827', fontWeight: '500' },
});

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  emoji: { fontSize: 18 },
  label: { flex: 1, fontSize: 15, color: '#111827' },
  chevron: { fontSize: 18, color: '#9CA3AF' },
});
