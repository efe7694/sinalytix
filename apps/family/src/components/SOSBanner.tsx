import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePatientsStore } from '@/store/patients';

export function SOSBanner() {
  const { activeSOS, dismissSOS, patients, selectedPatientId } = usePatientsStore();

  if (!activeSOS) return null;

  const patient = patients.find((p) => p.patient_id === activeSOS.patient_id);
  const time = new Date(activeSOS.created_at).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        🚨 {patient?.first_name ?? 'Hasta'} acil yardım çağrısı başlattı — {time}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL('tel:911')}
        >
          <Text style={styles.callText}>911&apos;i Ara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={dismissSOS}>
          <Text style={styles.dismissText}>Gördüm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  text: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  dismissBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
