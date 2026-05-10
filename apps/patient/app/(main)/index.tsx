import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTaskStore, type Task } from '@/store/tasks';
import { useCallsStore } from '@/store/calls';
import { useNotificationsStore } from '@/store/notifications';
import SOSPopup from '@/components/SOSPopup';
import StandardCallModal from '@/components/StandardCallModal';
import SinaModal from '@/components/SinaModal';
import NotificationPanel from '@/components/NotificationPanel';
import TaskItem from '@/components/TaskItem';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET, SHADOW } from '@sinalytix/ui';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
}

function todayLabel() {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, pendingUndo, loading, loadToday, completeTask, undoTask, skipTask, incrementCounter } =
    useTaskStore();
  const { availability, loadAvailability } = useCallsStore();
  const { unreadCount, loadNotifications } = useNotificationsStore();

  const [sosVisible, setSosVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [sinaVisible, setSinaVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadToday();
      loadAvailability();
      loadNotifications();
      const interval = setInterval(loadToday, 30_000);
      return () => clearInterval(interval);
    }, []),
  );

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const skippedTasks = tasks.filter((t) => t.status === 'skipped');

  const allDone = tasks.length > 0 && todoTasks.length === 0 && skippedTasks.length === 0;
  const isEmpty = tasks.length === 0;

  const anyAvailable = availability?.caregiver_available || availability?.family_available;

  function handleCall() {
    if (!anyAvailable) {
      showToast('Şu an ulaşabileceğin kimse yok.');
      return;
    }
    setCallModalVisible(true);
  }

  function handleNotifNavigate(
    target: 'task_list' | 'inbox' | 'settings_privacy',
    params: { conversation_id?: string } | null,
  ) {
    if (target === 'inbox') {
      if (params?.conversation_id) {
        router.push(`/conversation/${params.conversation_id}` as any);
      } else {
        router.push('/(main)/messages');
      }
    } else if (target === 'settings_privacy') {
      router.push('/settings/privacy' as any);
    }
  }

  function renderTask(task: Task) {
    return (
      <TaskItem
        key={task.occurrence_id}
        task={task}
        canUndo={!!pendingUndo[task.occurrence_id]}
        onComplete={() => completeTask(task.occurrence_id)}
        onUndo={() => undoTask(task.occurrence_id)}
        onSkip={() => skipTask(task.occurrence_id)}
        onIncrement={() => incrementCounter(task.occurrence_id)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── HEADER ─────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Sinalytix</Text>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
        </View>
        <Pressable
          style={styles.bellBtn}
          onPress={() => setNotifVisible(true)}
          hitSlop={12}
          accessibilityLabel="Bildirimler"
          accessibilityRole="button"
        >
          <Ionicons
            name={unreadCount() > 0 ? 'notifications' : 'notifications-outline'}
            size={24}
            color={COLORS.primary}
          />
          {unreadCount() > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount() > 99 ? '99+' : unreadCount()}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── AKSİYON BUTONLARI (2+1) ───────────────── */}
      <View style={styles.actions}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnSOS}
            onPress={() => setSosVisible(true)}
            activeOpacity={0.85}
            accessibilityLabel="SOS çağrısı başlat"
            accessibilityRole="button"
            accessibilityHint="Acil yardım çağrısı başlatır"
          >
            <Ionicons name="alert-circle" size={26} color="#FFFFFF" />
            <Text style={styles.btnSOSLabel}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnCall, !anyAvailable && styles.btnCallDimmed]}
            onPress={handleCall}
            activeOpacity={0.85}
            accessibilityLabel={anyAvailable ? 'Standart çağrı başlat' : 'Şu an müsait kimse yok'}
            accessibilityRole="button"
          >
            <Ionicons
              name="call-outline"
              size={24}
              color={anyAvailable ? COLORS.primary : COLORS.textDisabled}
            />
            <Text style={[styles.btnCallLabel, !anyAvailable && styles.btnCallLabelDimmed]}>
              Çağrı
            </Text>
            {!anyAvailable && (
              <Text style={styles.availabilityText}>Müsait değil</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btnSina}
          onPress={() => setSinaVisible(true)}
          activeOpacity={0.85}
          accessibilityLabel="Sina ile konuş"
          accessibilityRole="button"
        >
          <Ionicons name="mic-outline" size={24} color="#FFFFFF" />
          <Text style={styles.btnSinaLabel}>Sina'ya Sor</Text>
        </TouchableOpacity>
      </View>

      {/* ── GÖREV LİSTESİ ─────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Bugünün Görevleri</Text>
            {tasks.length > 0 && (
              <Text style={styles.sectionMeta}>
                {doneTasks.length}/{tasks.length} tamamlandı
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/add-task')}
            hitSlop={8}
            accessibilityLabel="Görev ekle"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading && tasks.length === 0 ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : isEmpty ? (
          <EmptyState onAdd={() => router.push('/add-task')} />
        ) : allDone ? (
          <AllDoneState />
        ) : (
          <View style={styles.taskList}>
            {todoTasks.map(renderTask)}
            {doneTasks.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Tamamlananlar</Text>
                {doneTasks.map(renderTask)}
              </>
            )}
            {skippedTasks.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Atlananlar</Text>
                {skippedTasks.map(renderTask)}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <SOSPopup
        visible={sosVisible}
        ecPhone={availability?.ec_primary?.phone ?? null}
        ecName={availability?.ec_primary?.name ?? null}
        ecId={availability?.ec_primary?.ec_id ?? null}
        onClose={() => setSosVisible(false)}
      />

      {callModalVisible && availability && (
        <StandardCallModal
          visible={callModalVisible}
          availability={availability}
          onClose={() => setCallModalVisible(false)}
        />
      )}

      <SinaModal visible={sinaVisible} onClose={() => setSinaVisible(false)} />

      <NotificationPanel
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        onNavigate={handleNotifNavigate}
      />
    </SafeAreaView>
  );
}

function EmptyState({ onAdd }: { onAdd(): void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="clipboard-outline" size={32} color={COLORS.primaryMuted} />
      </View>
      <Text style={styles.emptyTitle}>Bugün için görev yok</Text>
      <Text style={styles.emptySubtitle}>İlk görevini ekleyerek başla.</Text>
      <TouchableOpacity style={styles.emptyAddBtn} onPress={onAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.emptyAddLabel}>Görev Ekle</Text>
      </TouchableOpacity>
    </View>
  );
}

function AllDoneState() {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, styles.emptyIconDone]}>
        <Ionicons name="checkmark" size={32} color={COLORS.secondary} />
      </View>
      <Text style={styles.emptyTitle}>Harika iş!</Text>
      <Text style={styles.emptySubtitle}>Bugünkü tüm görevleri tamamladın.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.MD,
    backgroundColor: '#ffffff',
    ...SHADOW.SM,
  },
  logo: {
    fontSize: FONT_SIZE.H2,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  bellBtn: {
    width: TOUCH_TARGET.PREFERRED,
    height: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  actions: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
    gap: SPACING.SM,
    backgroundColor: '#ffffff',
  },
  actionsRow: { flexDirection: 'row', gap: SPACING.SM },

  btnSOS: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: COLORS.sos,
    shadowColor: COLORS.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnSOSLabel: { fontSize: FONT_SIZE.H3, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  btnCall: {
    flex: 1,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  btnCallDimmed: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
  btnCallLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '700', color: COLORS.primary },
  btnCallLabelDimmed: { color: COLORS.textDisabled },
  availabilityText: { fontSize: 11, color: COLORS.textDisabled },

  btnSina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: COLORS.primary,
  },
  btnSinaLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '700', color: '#FFF' },

  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.LG,
    paddingBottom: SPACING.XXL,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionMeta: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  addBtn: {
    width: TOUCH_TARGET.PREFERRED,
    height: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: { gap: SPACING.SM },
  groupLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
    color: COLORS.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  loader: { marginTop: SPACING.XXL },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.SM,
    paddingTop: SPACING.XXL,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  emptyIconDone: {
    backgroundColor: COLORS.secondaryContainer,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM + 2,
    borderRadius: BORDER_RADIUS.FULL,
    marginTop: SPACING.SM,
  },
  emptyAddLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: '#FFF' },
});
