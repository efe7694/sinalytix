import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TaskOccurrence, useTasksStore } from '@/store/tasks';

interface TaskItemProps {
  task: TaskOccurrence;
  patientId: string;
}

export function TaskItem({ task, patientId }: TaskItemProps) {
  const { completeTask, incrementCounter, skipTask } = useTasksStore();
  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';
  const isMedication = task.subtype === 'medication';

  const actorLabel: Record<string, string> = {
    patient: 'Hasta',
    caregiver: 'Sen',
    family: 'Aile',
    system: 'Sistem',
  };

  return (
    <View style={[styles.row, isDone && styles.rowDone, isSkipped && styles.rowSkipped]}>
      {/* Status icon */}
      <View style={styles.iconWrapper}>
        {isDone ? (
          <Text style={styles.iconDone}>✓</Text>
        ) : isSkipped ? (
          <Text style={styles.iconSkipped}>—</Text>
        ) : (
          <View style={[styles.iconTodo, isMedication && styles.iconMed]}>
            {isMedication ? <Text style={styles.iconMedText}>💊</Text> : null}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, (isDone || isSkipped) && styles.titleDimmed]}>
          {task.title}
        </Text>
        {isMedication && !isDone && (
          <Text style={styles.medLabel}>İlaç Yardımı</Text>
        )}
        {isDone && isMedication && (
          <Text style={styles.medDoneLabel}>İlaç Yardımı Tamamlandı</Text>
        )}
        <Text style={styles.actor}>
          {actorLabel[task.created_by_actor_type] ?? task.created_by_actor_type}
        </Text>
      </View>

      {/* Action */}
      {!isDone && !isSkipped && (
        <View style={styles.action}>
          {task.type === 'counter' ? (
            <View style={styles.counterRow}>
              <Text style={styles.counterProgress}>
                {task.progress_count ?? 0}/{task.target_per_day ?? 0}
              </Text>
              <TouchableOpacity
                style={styles.incrementBtn}
                onPress={() => incrementCounter(task.occurrence_id, patientId)}
              >
                <Text style={styles.incrementBtnText}>+1</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => completeTask(task.occurrence_id, patientId)}
            >
              <Text style={styles.completeBtnText}>
                {isMedication ? 'Tamamla' : 'Tamamla'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => skipTask(task.occurrence_id, patientId)}
          >
            <Text style={styles.skipBtnText}>Geç</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  rowDone: { opacity: 0.55 },
  rowSkipped: { opacity: 0.45 },
  iconWrapper: { width: 28, alignItems: 'center' },
  iconTodo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMed: { borderColor: '#6EE7B7', backgroundColor: '#F0FDF4' },
  iconMedText: { fontSize: 12 },
  iconDone: { fontSize: 18, color: '#059669', fontWeight: '700' },
  iconSkipped: { fontSize: 18, color: '#9CA3AF', fontWeight: '700' },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: '#111827' },
  titleDimmed: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  medLabel: { fontSize: 11, color: '#059669', marginTop: 2 },
  medDoneLabel: { fontSize: 11, color: '#6EE7B7', marginTop: 2 },
  actor: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  action: { gap: 4, alignItems: 'flex-end' },
  completeBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: '#059669' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterProgress: { fontSize: 13, color: '#374151', fontWeight: '600' },
  incrementBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  incrementBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  skipBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  skipBtnText: { fontSize: 12, color: '#9CA3AF' },
});
