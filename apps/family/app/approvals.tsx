import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { coreApi, ApiError } from '@/lib/api';
import { usePatientsStore } from '@/store/patients';

const BRAND = '#6366F1';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_approved_no_approver';

interface ApprovalRequest {
  approval_id: string;
  action_type: 'caregiver_link_change' | 'family_link_permission_change';
  requested_by_name: string;
  requested_by_role: 'caregiver' | 'family' | 'patient';
  description: string;
  created_at: string;
  expires_at: string;
  status: ApprovalStatus;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  caregiver_link_change: { label: 'Bakıcı Bağlantısı', icon: '🤝' },
  family_link_permission_change: { label: 'Erişim Düzeyi', icon: '🔐' },
};

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  approved: { label: 'Onaylandı', bg: '#DCFCE7', fg: '#16A34A' },
  rejected: { label: 'Reddedildi', bg: '#FEE2E2', fg: '#DC2626' },
  expired: { label: 'Süresi Doldu', bg: '#F3F4F6', fg: '#6B7280' },
  auto_approved_no_approver: { label: 'Otomatik Onaylandı', bg: '#FEF3C7', fg: '#92400E' },
};

const ROLE_LABELS: Record<string, string> = {
  caregiver: 'Bakıcı',
  family: 'Aile',
  patient: 'Hasta',
};

export default function ApprovalsScreen() {
  const router = useRouter();
  const { selectedPatientId } = usePatientsStore();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    try {
      const data = await coreApi.get<ApprovalRequest[]>(`/patients/${selectedPatientId}/approvals`);
      setRequests(data ?? []);
    } catch {
      // offline / not-yet-linked — leave the list as-is
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedPatientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDecide = async (approvalId: string, decision: 'approved' | 'rejected') => {
    if (processingId) return;
    setProcessingId(approvalId);
    try {
      await coreApi.post(`/approvals/${approvalId}/${decision === 'approved' ? 'approve' : 'reject'}`, {});
      // Re-fetch: approving carries out the underlying action server-side, so
      // the authoritative state (and any newly-resolved siblings) comes from
      // the server, not an optimistic local flip.
      await load();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 403
          ? 'Bu talebi karara bağlama yetkiniz yok.'
          : e instanceof ApiError && e.status === 409
            ? 'Bu talep zaten karara bağlanmış veya süresi dolmuş.'
            : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
      Alert.alert('Hata', msg);
      await load();
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Onay Kuyruğu</Text>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {pending.length === 0 && resolved.length === 0 ? (
            <Text style={styles.empty}>Bekleyen onay talebi yok.</Text>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Bekleyen ({pending.length})</Text>
                  {pending.map((r) => (
                    <ApprovalCard
                      key={r.approval_id}
                      request={r}
                      isProcessing={processingId === r.approval_id}
                      onApprove={() => handleDecide(r.approval_id, 'approved')}
                      onReject={() => handleDecide(r.approval_id, 'rejected')}
                    />
                  ))}
                </>
              )}
              {resolved.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Tamamlananlar</Text>
                  {resolved.map((r) => (
                    <ApprovalCard key={r.approval_id} request={r} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ApprovalCard({
  request,
  isProcessing,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  isProcessing?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const meta = TYPE_LABELS[request.action_type] ?? { label: request.action_type, icon: '🔔' };
  const time = new Date(request.created_at).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPending = request.status === 'pending';
  const statusMeta = STATUS_META[request.status];

  return (
    <View style={[styles.card, !isPending && styles.cardResolved]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{meta.icon}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardType}>{meta.label}</Text>
          <Text style={styles.cardMeta}>
            {ROLE_LABELS[request.requested_by_role]} · {request.requested_by_name} · {time}
          </Text>
        </View>
        {!isPending && statusMeta && (
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardDesc}>{request.description}</Text>

      {isPending && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
            onPress={onReject}
            disabled={isProcessing}
          >
            <Text style={styles.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
            onPress={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveBtnText}>Onayla</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 10 },
  empty: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: -2,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardResolved: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIcon: { fontSize: 22, marginTop: 1 },
  cardHeaderText: { flex: 1, gap: 2 },
  cardType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6B7280' },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusApprovedText: { color: '#16A34A' },
  statusRejectedText: { color: '#DC2626' },
  cardDesc: { fontSize: 14, color: '#374151', lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  approveBtn: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
