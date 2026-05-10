import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/auth';
import { usePatientsStore } from '@/store/patients';
import { useDndStore } from '@/store/dnd';

const BRAND = '#6366F1';

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'Eş',
  child: 'Çocuk',
  sibling: 'Kardeş',
  parent: 'Ebeveyn',
  other: 'Diğer',
};

const PERMISSION_LABELS: Record<string, { label: string; color: string }> = {
  view: { label: 'Salt Okunur', color: '#6B7280' },
  edit: { label: 'Düzenleme', color: '#059669' },
  full: { label: 'Tam Yetki', color: BRAND },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const { patients, selectedPatientId } = usePatientsStore();
  const { dnd, toggleDnd } = useDndStore();

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId);
  const perm = selectedPatient ? PERMISSION_LABELS[selectedPatient.permission_level] : null;

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile summary */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>
              {profile?.first_name} {profile?.last_name}
            </Text>
            <Text style={styles.profileSub}>
              {profile?.relationship ? RELATIONSHIP_LABELS[profile.relationship] : ''} · Aile Üyesi
            </Text>
          </View>
        </View>

        {/* Gizlilik & Bağlantılar */}
        <SectionHeader title="Gizlilik & Bağlantılar" />

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Rahatsız Etme Modu</Text>
              <Text style={styles.settingSubtitle}>Standart çağrıları engeller</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, dnd && styles.toggleActive]}
              onPress={() => selectedPatientId && toggleDnd(selectedPatientId)}
            >
              <View style={[styles.toggleThumb, dnd && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bağlı Hastalar */}
        <SectionHeader title="Bağlı Hastalar" />

        {patients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Henüz bağlı hasta yok.</Text>
            <TouchableOpacity onPress={() => router.push('/onboarding/connect')}>
              <Text style={styles.linkText}>Hasta Bağla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          patients.map((p) => {
            const permInfo = PERMISSION_LABELS[p.permission_level];
            return (
              <View key={p.patient_id} style={styles.patientRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>
                    {p.first_name} {p.last_name}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {RELATIONSHIP_LABELS[p.relationship]} ·{' '}
                    <Text style={{ color: permInfo.color, fontWeight: '600' }}>
                      {permInfo.label}
                    </Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => router.push('/approvals')}
                >
                  <Text style={styles.detailBtnText}>Yetki ›</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addPatientBtn}
          onPress={() => router.push('/onboarding/connect')}
        >
          <Text style={styles.addPatientBtnText}>+ Yeni Hasta Bağla</Text>
        </TouchableOpacity>

        {/* Hesabım */}
        <SectionHeader title="Hesabım" />

        <View style={styles.settingCard}>
          <MenuItem label="Bildirimler" onPress={() => router.push('/notifications')} />
          <MenuItem label="Onay Kuyruğu" onPress={() => router.push('/approvals')} />
          <MenuItem label="Veri Exportu" onPress={() => {/* TODO */}} />
          <MenuItem label="Hesabı Sil" onPress={() => {/* TODO */}} isDestructive />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuItem({
  label,
  onPress,
  isDestructive,
}: {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuItemText, isDestructive && styles.menuItemDestructive]}>
        {label}
      </Text>
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 12 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: BRAND },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: -4,
    paddingHorizontal: 4,
  },

  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingLeft: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: BRAND },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  detailBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  detailBtnText: { fontSize: 13, color: BRAND, fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  linkText: { fontSize: 14, color: BRAND, fontWeight: '600' },

  addPatientBtn: {
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addPatientBtnText: { color: BRAND, fontSize: 14, fontWeight: '600' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuItemText: { flex: 1, fontSize: 15, color: '#374151' },
  menuItemDestructive: { color: '#DC2626' },
  menuItemArrow: { fontSize: 18, color: '#C4C6CF' },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
