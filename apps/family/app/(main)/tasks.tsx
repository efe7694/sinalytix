import { useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { usePatientsStore } from '@/store/patients';
import { useTasksStore, type AddTaskPayload, type TaskOccurrence, type TaskType, type TaskSubtype } from '@/store/tasks';

const BRAND = '#6366F1';

type FilterTab = 'all' | 'todo' | 'done' | 'skipped';

export default function TasksScreen() {
  const { selectedPatientId } = usePatientsStore();
  const { tasks, fetchTodayTasks, addTask, carryOverTask } = useTasksStore();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [addVisible, setAddVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const todoPart = filtered.filter((t) => t.status === 'todo');
  const donePart = filtered.filter((t) => t.status === 'done');
  const skippedPart = filtered.filter((t) => t.status === 'skipped');

  const onRefresh = async () => {
    if (!selectedPatientId) return;
    setRefreshing(true);
    await fetchTodayTasks(selectedPatientId);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />

      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Bugün · {today}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'todo', 'done', 'skipped'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab === 'all' ? 'Tümü' : tab === 'todo' ? 'Bekleyen' : tab === 'done' ? 'Tamamlanan' : 'Atlanan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {todoPart.length === 0 && donePart.length === 0 && skippedPart.length === 0 ? (
          <Text style={styles.empty}>
            {filter === 'all' ? 'Bugün planlanmış görev yok' : 'Bu kategoride görev yok'}
          </Text>
        ) : (
          <>
            {todoPart.map((t) => (
              <TaskRow key={t.occurrence_id} task={t} onCarryOver={carryOverTask} />
            ))}
            {donePart.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Tamamlananlar ({donePart.length})</Text>
                {donePart.map((t) => (
                  <TaskRow key={t.occurrence_id} task={t} onCarryOver={carryOverTask} />
                ))}
              </>
            )}
            {skippedPart.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Atlananlar ({skippedPart.length})</Text>
                {skippedPart.map((t) => (
                  <TaskRow key={t.occurrence_id} task={t} onCarryOver={carryOverTask} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <AddTaskModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        patientId={selectedPatientId ?? ''}
        onAdd={addTask}
      />
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  onCarryOver,
}: {
  task: TaskOccurrence;
  onCarryOver: (id: string, date: string) => void;
}) {
  const roleEmoji: Record<string, string> = {
    patient: '🧑',
    caregiver: '👩‍⚕️',
    family: '👪',
  };
  const createdBy = roleEmoji[task.created_by_actor_type] ?? '?';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return (
    <View style={[styles.taskRow, task.status === 'done' && styles.taskRowDone]}>
      <View style={styles.taskLeft}>
        {task.subtype === 'medication' && <Text style={styles.medIcon}>💊 </Text>}
        <Text style={[styles.taskTitle, task.status === 'done' && styles.taskTitleDone]}>
          {task.title}
        </Text>
      </View>
      <View style={styles.taskRight}>
        <Text style={styles.createdBy}>{createdBy}</Text>
        {task.status === 'todo' && (
          <TouchableOpacity
            style={styles.carryBtn}
            onPress={() => onCarryOver(task.occurrence_id, tomorrowStr)}
          >
            <Text style={styles.carryBtnText}>›› Yarına</Text>
          </TouchableOpacity>
        )}
        {task.status === 'done' && (
          <Text style={styles.completedBy}>✓</Text>
        )}
        {task.type === 'counter' && task.target_per_day && (
          <Text style={styles.counter}>
            {task.progress_count ?? 0}/{task.target_per_day}
          </Text>
        )}
      </View>
    </View>
  );
}

function AddTaskModal({
  visible,
  onClose,
  patientId,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  onAdd: (p: AddTaskPayload) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('one_time');
  const [subtype, setSubtype] = useState<TaskSubtype>('standard');
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const isValid = title.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || !patientId) return;
    setIsLoading(true);
    try {
      await onAdd({
        patient_id: patientId,
        title: title.trim(),
        type,
        subtype,
        date_local: today,
      });
      setTitle('');
      setType('one_time');
      setSubtype('standard');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Yeni Görev</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>İptal</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Görev Başlığı</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Görev açıklaması..."
              maxLength={150}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Görev Tipi</Text>
            <View style={styles.chips}>
              {(['one_time', 'recurring', 'counter'] as TaskType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, type === t && styles.chipSelected]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextSelected]}>
                    {t === 'one_time' ? 'Tek Seferlik' : t === 'recurring' ? 'Tekrarlayan' : 'Sayaç'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Alt Tip</Text>
            <View style={styles.chips}>
              {(['standard', 'medication'] as TaskSubtype[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, subtype === s && styles.chipSelected]}
                  onPress={() => setSubtype(s)}
                >
                  <Text style={[styles.chipText, subtype === s && styles.chipTextSelected]}>
                    {s === 'standard' ? 'Standart' : '💊 İlaç'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {subtype === 'medication' && (
              <Text style={styles.medNote}>
                Dozaj bilgisi için Hasta Profilini ziyaret edin.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.saveBtn, (!isValid || isLoading) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || isLoading}
          >
            <Text style={styles.saveBtnText}>{isLoading ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  screenTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  addBtn: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: { backgroundColor: BRAND },
  filterTabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 8 },
  empty: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 32 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  taskRowDone: { opacity: 0.6 },
  taskLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  medIcon: { fontSize: 16 },
  taskTitle: { flex: 1, fontSize: 15, color: '#111827', lineHeight: 21 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createdBy: { fontSize: 16 },
  carryBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carryBtnText: { fontSize: 12, color: BRAND, fontWeight: '600' },
  completedBy: { fontSize: 16 },
  counter: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  // Modal
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 16, color: '#6B7280' },
  modalScroll: { flex: 1 },
  modalContent: { paddingHorizontal: 20, paddingTop: 24, gap: 24, paddingBottom: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: BRAND, backgroundColor: '#EEF2FF' },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: BRAND, fontWeight: '600' },
  medNote: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  modalActions: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 },
  saveBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C7D2FE' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
