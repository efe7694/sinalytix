import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShiftsStore } from '@/store/shifts';

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

export default function ShiftHistoryScreen() {
  const router = useRouter();
  const { history, fetchHistory } = useShiftsStore();

  useEffect(() => { fetchHistory(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vardiya Geçmişi</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.shift_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardDate}>
                {new Date(item.checked_in_at).toLocaleDateString([], {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Text style={styles.cardDuration}>{formatDuration(item.duration_minutes)}</Text>
            </View>
            <Text style={styles.cardTime}>
              {new Date(item.checked_in_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' — '}
              {item.checked_out_at
                ? new Date(item.checked_out_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Devam ediyor'}
            </Text>
            {item.shift_note ? (
              <Text style={styles.cardNote} numberOfLines={2}>
                {item.shift_note}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz kapalı vardiya yok.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDuration: { fontSize: 15, fontWeight: '700', color: '#059669' },
  cardTime: { fontSize: 13, color: '#6B7280' },
  cardNote: { fontSize: 13, color: '#4B5563', marginTop: 4, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
