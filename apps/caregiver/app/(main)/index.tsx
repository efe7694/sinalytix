import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PatientSelector } from '@/components/PatientSelector';
import { ShiftCard } from '@/components/ShiftCard';
import { TaskItem } from '@/components/TaskItem';
import { UndoBar } from '@/components/UndoBar';
import { CheckoutBottomSheet } from '@/components/CheckoutBottomSheet';
import { SwitchPatientModal } from '@/components/SwitchPatientModal';
import { usePatientsStore } from '@/store/patients';
import { useShiftsStore } from '@/store/shifts';
import { useTasksStore } from '@/store/tasks';

export default function HomeScreen() {
  const router = useRouter();
  const { patients, selectedPatientId, selectPatient, fetchPatients } = usePatientsStore();
  const { activeShift, checkIn, fetchActiveShift } = useShiftsStore();
  const { tasks, fetchTodayTasks, isLoading: tasksLoading } = useTasksStore();

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId) ?? null;

  useEffect(() => {
    if (selectedPatientId) {
      fetchTodayTasks(selectedPatientId);
    }
  }, [selectedPatientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPatients(),
      fetchActiveShift(),
      selectedPatientId ? fetchTodayTasks(selectedPatientId) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!selectedPatientId) return;
    if (activeShift && activeShift.patient_id !== selectedPatientId) {
      setSwitchTarget(selectedPatientId);
      return;
    }
    await checkIn(selectedPatientId);
  };

  const handleSwitchConfirm = () => {
    setSwitchTarget(null);
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sinalytix</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Text style={styles.bell}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Patient Selector — sticky */}
      <PatientSelector />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shift Card */}
        <ShiftCard
          onCheckOut={() => setCheckoutVisible(true)}
          onCheckIn={handleCheckIn}
          onSwitchPatient={() => selectedPatientId && setSwitchTarget(selectedPatientId)}
        />

        {/* Action Buttons */}
        {selectedPatient && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Standart Çağrı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/sina')}>
              <Text style={styles.actionIcon}>🎤</Text>
              <Text style={styles.actionLabel}>Sina</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Tasks */}
        {selectedPatient ? (
          <View style={styles.taskSection}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>
                {selectedPatient.first_name} — Bugünün Görevleri
              </Text>
              <Text style={styles.taskProgress}>
                {completedCount}/{totalCount} tamamlandı
              </Text>
            </View>

            {tasks.length === 0 && !tasksLoading ? (
              <Text style={styles.emptyTasks}>
                Bugün {selectedPatient.first_name} için görev yok.
              </Text>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.occurrence_id}
                  task={task}
                  patientId={selectedPatientId!}
                />
              ))
            )}

            <TouchableOpacity style={styles.addTaskBtn} onPress={() => router.push('/add-task')}>
              <Text style={styles.addTaskText}>+ Görev Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPatient}>
            <Text style={styles.noPatientText}>Hasta seçin veya bağlayın.</Text>
          </View>
        )}
      </ScrollView>

      {/* Checkout Bottom Sheet */}
      <CheckoutBottomSheet
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
      />

      {/* Switch Patient Modal */}
      <SwitchPatientModal
        visible={!!switchTarget}
        targetPatientId={switchTarget}
        onClose={handleSwitchConfirm}
      />

      {/* Undo Bar */}
      <UndoBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: { fontSize: 20, fontWeight: '800', color: '#059669', letterSpacing: -0.5 },
  bell: { fontSize: 22 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 40, gap: 16 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  taskSection: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  taskProgress: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyTasks: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  addTaskBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addTaskText: { fontSize: 14, color: '#059669', fontWeight: '600' },
  noPatient: { alignItems: 'center', paddingTop: 32 },
  noPatientText: { fontSize: 15, color: '#9CA3AF' },
});
