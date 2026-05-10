import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsStore, AppNotification, NotificationType, RedirectTarget } from '@/store/notifications';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';

// ── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  daily_report: 'document-text-outline',
  new_message: 'chatbubble-outline',
  task_reminder: 'checkmark-circle-outline',
  caregiver_connected: 'person-add-outline',
  caregiver_disconnected: 'person-remove-outline',
  ec_verification_reminder: 'shield-outline',
  symptom_report_sent: 'pulse-outline',
};

// ── Time format ───────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 2) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;
  if (diffHr < 24) return `${diffHr} saat önce`;
  if (diffDay === 1) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose(): void;
  onNavigate(target: RedirectTarget, params: AppNotification['redirect_params']): void;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress(): void;
}) {
  const icon = TYPE_ICON[item.type] ?? 'notifications-outline';

  return (
    <TouchableOpacity
      style={[styles.row, !item.is_read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!item.is_read && <View style={styles.unreadDot} />}

      <View style={[styles.rowIcon, !item.is_read && styles.rowIconUnread]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={item.is_read ? COLORS.textSecondary : COLORS.primary}
        />
      </View>

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, !item.is_read && styles.rowTitleUnread]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.textDisabled} />
    </TouchableOpacity>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function NotificationPanel({ visible, onClose, onNavigate }: Props) {
  const { notifications, loading, loadNotifications, markAllRead } = useNotificationsStore();

  useEffect(() => {
    if (visible) {
      loadNotifications();
      // Mark all read when panel opens (optimistic; API called inside)
      markAllRead();
    }
  }, [visible]);

  function handleTap(item: AppNotification) {
    onClose();
    // Small delay so the sheet closes before navigation
    setTimeout(() => onNavigate(item.redirect_target, item.redirect_params), 150);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bildirimler</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading && notifications.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="notifications-outline" size={44} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
              <Text style={styles.emptyHint}>
                Bakım etkinliklerin burada görünecek.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.notification_id}
              renderItem={({ item }) => (
                <NotificationRow item={item} onPress={() => handleTap(item)} />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 200,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.SM,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: TOUCH_TARGET.MINIMUM,
    height: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },

  list: { paddingBottom: SPACING.XL },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    gap: SPACING.MD,
    backgroundColor: COLORS.background,
  },
  rowUnread: {
    backgroundColor: '#F8FBFF',
  },
  unreadDot: {
    position: 'absolute',
    left: SPACING.SM,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowIconUnread: {
    backgroundColor: COLORS.surfaceSelected,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  rowTitleUnread: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowTime: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.LG + 40 + SPACING.MD,
  },

  center: {
    padding: SPACING.XL,
    alignItems: 'center',
    gap: SPACING.MD,
    minHeight: 160,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
});
