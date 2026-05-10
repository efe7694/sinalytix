import { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

interface CaregiverNotification {
  notification_id: string;
  notification_type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  action_url: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  shift_cancelled: '#DC2626',
  urgent_message: '#DC2626',
  shift_assigned: '#2563EB',
  care_plan_updated: '#2563EB',
  new_direct_message: '#6B7280',
  task_assigned: '#059669',
};

function NotificationRow({
  item,
  onPress,
}: {
  item: CaregiverNotification;
  onPress: () => void;
}) {
  const accentColor = PRIORITY_COLORS[item.notification_type] ?? '#9CA3AF';
  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.rowTime}>
          {new Date(item.created_at).toLocaleString([], {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<CaregiverNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<CaregiverNotification[]>('/notifications/caregiver');
      setNotifications(data);
    } catch {
      // fail silently
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.notification_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => {}} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz bildirim yok.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  back: { fontSize: 16, color: '#059669', fontWeight: '500', width: 48 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  rowUnread: { backgroundColor: '#F0FDF4' },
  accent: { width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 40 },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowBody: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  rowTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginTop: 6,
  },
  separator: { height: 1, backgroundColor: '#F9FAFB' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
