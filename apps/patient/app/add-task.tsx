/**
 * Görev Ekleme Ekranı — modal olarak sunulur.
 * Tip: one_time | recurring | counter
 * Subtype: standard | medication
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '@/store/tasks';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

type TaskType = 'one_time' | 'recurring' | 'counter';
type Frequency = 'daily' | 'weekly';
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_TR: Record<string, string> = {
  MON: 'Pt', TUE: 'Sa', WED: 'Ça', THU: 'Pe', FRI: 'Cu', SAT: 'Ct', SUN: 'Pz',
};

export default function AddTaskScreen() {
  const router = useRouter();
  const { createTask } = useTaskStore();

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
      await createTask({
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
            placeholder="ör. İlaç al, 8 bardak su iç..."
            placeholderTextColor={COLORS.textDisabled}
            autoFocus
            returnKeyType="done"
            maxLength={200}
          />
        </View>

        {/* Tip seçici */}
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

        {/* Counter: hedef */}
        {type === 'counter' && (
          <View style={styles.field}>
            <Text style={styles.label}>Günlük Hedef</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={targetPerDay}
              onChangeText={setTargetPerDay}
              placeholder="ör. 8"
              placeholderTextColor={COLORS.textDisabled}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        )}

        {/* Recurring: sıklık */}
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
                      <Text style={[styles.dayLabel, selectedDays.includes(d) && styles.dayLabelActive]}>
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
            <Ionicons name="medical-outline" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.switchLabel}>İlaç Görevi</Text>
              <Text style={styles.switchHint}>Gün sonu raporunda ayrıca gösterilir</Text>
            </View>
          </View>
          <Switch
            value={isMedication}
            onValueChange={setIsMedication}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={isMedication ? COLORS.primary : COLORS.textDisabled}
          />
        </View>
      </ScrollView>

      {/* Submit */}
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.LG,
    gap: SPACING.LG,
    paddingBottom: SPACING.MD,
  },

  field: { gap: SPACING.SM },
  label: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: TOUCH_TARGET.PREFERRED,
  },
  inputSmall: { minHeight: 52, width: 120 },

  // Tip segmented
  segmented: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  segBtnActive: { backgroundColor: COLORS.primary },
  segLabel: { fontSize: FONT_SIZE.CAPTION, fontWeight: '600', color: COLORS.textSecondary },
  segLabelActive: { color: '#FFF' },

  // Frequency
  freqRow: { flexDirection: 'row', gap: SPACING.SM },
  freqBtn: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
  },
  freqBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },

  // Days
  daysRow: { flexDirection: 'row', gap: SPACING.XS },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dayLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  dayLabelActive: { color: '#FFF' },

  // Medication switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM, flex: 1 },
  switchLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  switchHint: { fontSize: FONT_SIZE.CAPTION, color: COLORS.textDisabled, marginTop: 1 },

  // Footer
  footer: { padding: SPACING.LG, paddingTop: SPACING.SM },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.LG,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '700', color: '#FFF' },
});
