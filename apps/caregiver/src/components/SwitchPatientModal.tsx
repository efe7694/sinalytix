import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePatientsStore } from '@/store/patients';
import { useShiftsStore } from '@/store/shifts';

interface SwitchPatientModalProps {
  visible: boolean;
  targetPatientId: string | null;
  onClose: () => void;
}

export function SwitchPatientModal({ visible, targetPatientId, onClose }: SwitchPatientModalProps) {
  const { activeShift, switchPatient } = useShiftsStore();
  const patientsStore = usePatientsStore();

  const currentPatient = patientsStore.patients.find(
    (p) => p.patient_id === activeShift?.patient_id,
  );
  const newPatient = patientsStore.patients.find((p) => p.patient_id === targetPatientId);

  const handleConfirm = async () => {
    if (!targetPatientId) return;
    await switchPatient(targetPatientId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Aktif Vardiya Mevcut</Text>
          <Text style={styles.body}>
            {currentPatient
              ? `${currentPatient.first_name} ${currentPatient.last_name}`
              : 'Mevcut hasta'}
            {' '}hastasındaki vardiyan kapatılacak ve{' '}
            {newPatient
              ? `${newPatient.first_name} ${newPatient.last_name}`
              : 'yeni hasta'}
            {' '}için yeni vardiya başlayacak. Devam et?
          </Text>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Devam Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { fontSize: 14, color: '#4B5563', lineHeight: 21 },
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#6B7280', fontSize: 15 },
});
