import { useEffect } from 'react';
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
import { useNotificationsStore, type InAppNotification, type NotificationType } from '@/store/notifications';
import { usePatientsStore } from '@/store/patients';
import { useState } from 'react';

const BRAND = '#6366F1';

const TYPE_LABELS: Record<NotificationType, { label: string; icon: string; color: string }> = {
  sos: { label: 'SOS', icon: '🚨', color: '#DC2626' },
  caregiver_checkin: { label: 'Vardiya', icon: '🟢', color: '#059669' },
  caregiver_checkout: { label: 'Vardiya Bitti', icon: '🔴', color: '#6B7280' },
  task_change: { label: 'Görev', icon: '✅', color: '#059669' },
  new_message: { label: 'Mesaj', icon: '💬', color: BRAND },
  symptom: { label: 'Semptom', icon: '🩺', color: '#7C3AED' },
  approval_pending: { label: 'Onay Talebi', icon: '🔐', color: '#0891B2' },
  permission_change: { label: 'Yetki Değişikliği', icon: '🔑', color: '#0891B2' },
  caregiver_link_change: { label: 'Bakıcı Bağlantısı', icon: '🔗', color: '#0891B2' },
  daily_report: { label: 'Günlük Rapor', icon: '📋', color: '#374151' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const { notifications, fetchNotifications, markAllRead, isLoading } = useNotificationsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedPatientId) fetchNotifications(selectedPatientId);
  }, [selectedPatientId]);

  const onRefresh = async () => {
    if (!selectedPatientId) return;
    setRefreshing(true);
    await fetchNotifications(selectedPatientId);
    setRefreshing(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handlePress = (n: InAppNotification) => {
    switch (n.type) {
      case 'sos':
        router.back();
        break;
      case 'caregiver_checkin':
      case 'caregiver_checkout':
        router.push('/shift-detail');
        break;
      case 'task_change':
        router.push('/(main)/tasks');
        break;
      case 'new_message':
      case 'symptom':
      case 'daily_report':
        if (n.deep_link) router.push(n.deep_link as never);
        break;
      case 'approval_pending':
        router.push('/approvals');
        break;
      default:
        router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bildirimler</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => selectedPatientId && markAllRead(selectedPatientId)}>
            <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications.length === 0 ? (
          <Text style={styles.empty}>Bildirim yok.</Text>
        ) : (
          notifications.map((n) => (
            <NotificationRow key={n.notification_id} notification={n} onPress={() => handlePress(n)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: InAppNotification;
  onPress: () => void;
}) {
  const meta = TYPE_LABELS[notification.type] ?? { label: notification.type, icon: '🔔', color: '#6B7280' };
  const time = new Date(notification.created_at).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[styles.row, !notification.is_read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: meta.color + '18' }]}>
        <Text style={styles.icon}>{meta.icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowType, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.rowTime}>{time}</Text>
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>{notification.body}</Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: BRAND, fontWeight: '300' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  markAllText: { fontSize: 13, color: BRAND, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8, gap: 1 },
  empty: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rowUnread: { backgroundColor: '#FAFBFF' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 20 },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  rowTime: { fontSize: 12, color: '#9CA3AF' },
  rowBody: { fontSize: 14, color: '#374151', lineHeight: 20 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
    flexShrink: 0,
  },
});
