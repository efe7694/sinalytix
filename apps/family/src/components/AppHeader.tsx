import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePatientsStore } from '@/store/patients';
import { useDndStore } from '@/store/dnd';
import { useNotificationsStore } from '@/store/notifications';

const BRAND = '#6366F1';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const { patients, selectedPatientId, selectPatient } = usePatientsStore();
  const { dnd, toggleDnd } = useDndStore();
  const { unreadCount } = useNotificationsStore();

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId);
  const hasMultiple = patients.length > 1;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.patientSelector}
        disabled={!hasMultiple}
        onPress={() => {/* dropdown — V1 */}}
      >
        <Text style={styles.logo}>Sinalytix</Text>
        {selectedPatient ? (
          <Text style={styles.patientName} numberOfLines={1}>
            {selectedPatient.first_name} {selectedPatient.last_name}
            {hasMultiple ? ' ▾' : ''}
          </Text>
        ) : (
          <Text style={styles.noPatient}>Hasta seçilmedi</Text>
        )}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.dndBtn, dnd && styles.dndBtnActive]}
          onPress={() => selectedPatientId && toggleDnd(selectedPatientId)}
        >
          <Text style={styles.dndIcon}>{dnd ? '🔕' : '🔔'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/notifications')}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  patientSelector: { flex: 1, gap: 2 },
  logo: { fontSize: 12, fontWeight: '700', color: BRAND, letterSpacing: 1, textTransform: 'uppercase' },
  patientName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  noPatient: { fontSize: 15, color: '#9CA3AF' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dndBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dndBtnActive: { backgroundColor: '#FEE2E2' },
  dndIcon: { fontSize: 20 },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
