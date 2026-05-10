import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTasksStore } from '@/store/tasks';
import { usePatientsStore } from '@/store/patients';

type TaskType = 'one_time' | 'recurring' | 'counter';
type Frequency = 'daily' | 'weekly';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_TR: Record<string, string> = {
  MON: 'Pt', TUE: 'Sa', WED: 'Ça', THU: 'Pe', FRI: 'Cu', SAT: 'Ct', SUN: 'Pz',
};

export default function AddTaskScreen() {
  const router = useRouter();
  const { createTask } = useTasksStore();
  const { selectedPatientId } = usePatientsStore();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('one_time');
  const [isMedication, setIsMedication] = useState(false);
  const [targetPerDay, setTargetPerDay] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Başlık gerekli', 'Lütfen görev başlığı girin.');
      return;
    }
    if (!selectedPatientId) {
      Alert.alert('Hasta seçili değil', 'Lütfen önce bir hasta seçin.');
      return;
    }
    if (type === 'counter' && (!targetPerDay || parseInt(targetPerDay) < 1)) {
      Alert.alert('Hedef gerekli', 'Sayaç görevi için günlük hedef girin.');
      return;
    }
    if (type === 'recurring' && frequency === 'weekly' && selectedDays.length === 0) {
      Alert.alert('Gün seçin', 'Haftalık tekrar için en az bir gün seçin.');
      return;
    }

    setLoading(true);
    try {
      await createTask(selectedPatientId, {
        title: title.trim(),
        type,
        subtype: isMedication ? 'medication' : 'standard',
        ...(type === 'counter' && { target_per_day: parseInt(targetPerDay) }),
        ...(type === 'recurring' && {
          frequency,
          ...(frequency === 'weekly' && { days_of_week: selectedDays }),
        }),
        ...(type === 'one_time' && {
          due_date_local: new Date().toISOString().slice(0, 10),
        }),
      });
      router.back();
    } catch {
      Alert.alert('Hata', 'Görev eklenemedi. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Görev Ekle</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.field}>
          <Text style={styles.label}>Görev Başlığı</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="ör. Egzersiz yaptır, İlaç ver..."
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="done"
            maxLength={200}
          />
        </View>

        {/* Görev Tipi */}
        <View style={styles.field}>
          <Text style={styles.label}>Görev Tipi</Text>
          <View style={styles.segmented}>
            {(['one_time', 'recurring', 'counter'] as TaskType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segBtn, type === t && styles.segBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.segLabel, type === t && styles.segLabelActive]}>
                  {t === 'one_time' ? 'Tek Seferlik' : t === 'recurring' ? 'Tekrarlayan' : 'Sayaç'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sayaç: günlük hedef */}
        {type === 'counter' && (
          <View style={styles.field}>
            <Text style={styles.label}>Günlük Hedef</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={targetPerDay}
              onChangeText={setTargetPerDay}
              placeholder="ör. 8"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        )}

        {/* Tekrarlayan: sıklık */}
        {type === 'recurring' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Sıklık</Text>
              <View style={styles.freqRow}>
                {(['daily', 'weekly'] as Frequency[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.segLabel, frequency === f && styles.segLabelActive]}>
                      {f === 'daily' ? 'Her Gün' : 'Haftalık'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {frequency === 'weekly' && (
              <View style={styles.field}>
                <Text style={styles.label}>Günler</Text>
                <View style={styles.daysRow}>
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dayBtn, selectedDays.includes(d) && styles.dayBtnActive]}
                      onPress={() => toggleDay(d)}
                    >
                      <Text
                        style={[styles.dayLabel, selectedDays.includes(d) && styles.dayLabelActive]}
                      >
                        {DAY_TR[d]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* İlaç toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchIcon}>💊</Text>
            <View>
              <Text style={styles.switchLabel}>İlaç Yardımı Görevi</Text>
              <Text style={styles.switchHint}>Gün sonu raporunda ayrıca listelenir</Text>
            </View>
          </View>
          <Switch
            value={isMedication}
            onValueChange={setIsMedication}
            trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
            thumbColor={isMedication ? '#059669' : '#9CA3AF'}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitLabel}>{loading ? 'Ekleniyor...' : 'Görevi Ekle'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  back: { fontSize: 16, color: '#059669', fontWeight: '500', width: 48 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  content: { padding: 20, gap: 20, paddingBottom: 12 },

  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 48,
    backgroundColor: '#fff',
  },
  inputSmall: { minHeight: 52, width: 120 },

  segmented: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segBtnActive: { backgroundColor: '#059669' },
  segLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  segLabelActive: { color: '#fff' },

  freqRow: { flexDirection: 'row', gap: 10 },
  freqBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  freqBtnActive: { borderColor: '#059669', backgroundColor: '#059669' },

  daysRow: { flexDirection: 'row', gap: 6 },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dayBtnActive: { borderColor: '#059669', backgroundColor: '#059669' },
  dayLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  dayLabelActive: { color: '#fff' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  switchIcon: { fontSize: 22 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  switchHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  footer: { padding: 20, paddingTop: 12 },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
