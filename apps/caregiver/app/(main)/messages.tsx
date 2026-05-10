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

interface ConversationPreview {
  conversation_id: string;
  type: 'direct' | 'group' | 'broadcast' | 'system_event';
  title: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  sender_name: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800) return 'Dün';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const TYPE_ICON: Record<ConversationPreview['type'], string> = {
  direct: '👤',
  group: '👥',
  broadcast: '📢',
  system_event: '🤖',
};

function ConversationRow({ item, onPress }: { item: ConversationPreview; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarIcon}>{TYPE_ICON[item.type]}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowTime}>{formatTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.rowPreview} numberOfLines={1}>{item.last_message}</Text>
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<ConversationPreview[]>('/messaging/conversations');
      setConversations(data);
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
        <Text style={styles.logo}>Sinalytix</Text>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <TouchableOpacity>
          <Text style={styles.newBtn}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversation_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() =>
              router.push(`/conversation/${item.conversation_id}`)
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz mesajınız yok.</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  logo: { fontSize: 18, fontWeight: '800', color: '#059669' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 8 },
  newBtn: { fontSize: 26, color: '#059669', fontWeight: '300' },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: { fontSize: 22 },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  rowTime: { fontSize: 12, color: '#9CA3AF' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowPreview: { flex: 1, fontSize: 13, color: '#6B7280' },
  badge: {
    backgroundColor: '#059669',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 74 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
