import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMessagingStore, Conversation } from '@/store/messaging';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const isGroup = item.type === 'group';
  const isArchived = !!item.archived_at;

  return (
    <TouchableOpacity
      style={[styles.row, isArchived && styles.rowArchived]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, isGroup && styles.avatarGroup]}>
        <Ionicons
          name={isGroup ? 'people' : 'person'}
          size={22}
          color={isGroup ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, isArchived && styles.nameArchived]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.rowMeta}>
            {item.last_message_at && (
              <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
            )}
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Text style={styles.preview} numberOfLines={1}>
            {isArchived
              ? 'Arşivlendi — geçmiş okunabilir'
              : (item.last_message_preview ?? 'Henüz mesaj yok')}
          </Text>
          {isArchived && (
            <Ionicons name="archive-outline" size={14} color={COLORS.textDisabled} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations, loadingConversations, error, loadConversations } = useMessagingStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const onRefresh = useCallback(() => {
    loadConversations();
  }, []);

  const active = conversations
    .filter((c) => !c.archived_at)
    .sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

  const archived = conversations.filter((c) => !!c.archived_at);
  const sorted = [...active, ...archived];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
      </View>

      {loadingConversations && sorted.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : error && sorted.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadConversations}>
            <Text style={styles.retryLabel}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={52} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
          <Text style={styles.emptyHint}>
            Aile üyeleri veya bakıcınız bağlandığında konuşmalar burada görünür.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.conversation_id}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => router.push(`/conversation/${item.conversation_id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={loadingConversations}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.H2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  list: { flexGrow: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    backgroundColor: COLORS.background,
  },
  rowArchived: { opacity: 0.6 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    flexShrink: 0,
  },
  avatarGroup: { backgroundColor: COLORS.surfaceSelected },

  rowBody: { flex: 1, gap: 2 },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.SM,
  },
  name: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  nameArchived: { color: COLORS.textSecondary },

  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    flexShrink: 0,
  },
  time: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.FULL,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },

  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  preview: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    flex: 1,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.LG + 44 + SPACING.MD,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
    gap: SPACING.MD,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  retryLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
