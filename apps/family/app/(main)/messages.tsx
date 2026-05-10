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
import { AppHeader } from '@/components/AppHeader';
import { usePatientsStore } from '@/store/patients';
import { useMessagesStore, type Conversation } from '@/store/messages';
import { useState } from 'react';

const BRAND = '#6366F1';

export default function MessagesScreen() {
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const { conversations, fetchConversations, isLoading } = useMessagesStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedPatientId) fetchConversations(selectedPatientId);
  }, [selectedPatientId]);

  const onRefresh = async () => {
    if (!selectedPatientId) return;
    setRefreshing(true);
    await fetchConversations(selectedPatientId);
    setRefreshing(false);
  };

  const groupConv = conversations.find((c) => c.is_group && !c.is_archived);
  const individualConvs = conversations.filter((c) => !c.is_group && !c.is_archived);
  const archived = conversations.filter((c) => c.is_archived);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      <Text style={styles.screenTitle}>Mesajlar</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {conversations.length === 0 ? (
          <Text style={styles.empty}>Henüz konuşma yok.</Text>
        ) : (
          <>
            {/* Care team group — pinned top */}
            {groupConv && (
              <ConvRow
                conv={groupConv}
                onPress={() => router.push(`/conversation/${groupConv.conversation_id}`)}
                isPinned
              />
            )}

            {/* Individual convs */}
            {individualConvs.map((c) => (
              <ConvRow
                key={c.conversation_id}
                conv={c}
                onPress={() => router.push(`/conversation/${c.conversation_id}`)}
              />
            ))}

            {/* Archived */}
            {archived.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Arşiv</Text>
                {archived.map((c) => (
                  <ConvRow
                    key={c.conversation_id}
                    conv={c}
                    onPress={() => router.push(`/conversation/${c.conversation_id}`)}
                    isArchived
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConvRow({
  conv,
  onPress,
  isPinned,
  isArchived,
}: {
  conv: Conversation;
  onPress: () => void;
  isPinned?: boolean;
  isArchived?: boolean;
}) {
  const time = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity
      style={[styles.convRow, isPinned && styles.convRowPinned, isArchived && styles.convRowArchived]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.convAvatar}>
        <Text style={styles.convAvatarText}>{conv.is_group ? '👥' : '👤'}</Text>
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convTop}>
          <Text style={styles.convName} numberOfLines={1}>{conv.name}</Text>
          <Text style={styles.convTime}>{time}</Text>
        </View>
        <View style={styles.convBottom}>
          <Text style={styles.convPreview} numberOfLines={1}>
            {isArchived ? '🔒 Arşivlendi' : conv.last_message_preview ?? '—'}
          </Text>
          {conv.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conv.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8, gap: 1 },
  empty: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  convRowPinned: { borderLeftWidth: 3, borderLeftColor: BRAND },
  convRowArchived: { opacity: 0.6 },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convAvatarText: { fontSize: 22 },
  convInfo: { flex: 1, gap: 4 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  convTime: { fontSize: 12, color: '#9CA3AF' },
  convBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convPreview: { flex: 1, fontSize: 14, color: '#6B7280' },
  unreadBadge: {
    backgroundColor: BRAND,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
