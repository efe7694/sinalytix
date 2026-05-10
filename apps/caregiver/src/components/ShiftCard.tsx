import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useShiftsStore } from '@/store/shifts';
import { usePatientsStore } from '@/store/patients';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface ShiftCardProps {
  onCheckOut: () => void;
  onCheckIn: () => void;
  onSwitchPatient: () => void;
}

export function ShiftCard({ onCheckOut, onCheckIn, onSwitchPatient }: ShiftCardProps) {
  const { activeShift, elapsedSeconds } = useShiftsStore();
  const { selectedPatientId } = usePatientsStore();
  const [elapsed, setElapsed] = useState(elapsedSeconds());
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => setElapsed(elapsedSeconds()), 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  useEffect(() => {
    if (!activeShift) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeShift]);

  const isActiveHere = activeShift?.patient_id === selectedPatientId;
  const isActiveElsewhere = activeShift && !isActiveHere;

  if (isActiveHere) {
    return (
      <Animated.View style={[styles.cardActive, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.activeRow}>
          <View style={styles.activeIndicator} />
          <Text style={styles.activeLabel}>Aktif Vardiya</Text>
          <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        </View>
        <TouchableOpacity style={styles.checkOutBtn} onPress={onCheckOut}>
          <Text style={styles.checkOutBtnText}>Vardiyayı Bitir</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (isActiveElsewhere) {
    return (
      <View style={styles.cardWarning}>
        <Text style={styles.warningText}>⚠ Başka bir hastada aktif vardiya var</Text>
        <TouchableOpacity style={styles.switchBtn} onPress={onSwitchPatient}>
          <Text style={styles.switchBtnText}>Vardiyayı Başlat (geçiş)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cardIdle}>
      <TouchableOpacity style={styles.startBtn} onPress={onCheckIn}>
        <Text style={styles.startBtnText}>Vardiyayı Başlat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669' },
  activeLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#065F46' },
  timer: { fontSize: 22, fontWeight: '700', color: '#059669', fontVariant: ['tabular-nums'] },
  checkOutBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  checkOutBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardWarning: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: { fontSize: 13, color: '#92400E' },
  switchBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  switchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardIdle: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
  },
  startBtn: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
