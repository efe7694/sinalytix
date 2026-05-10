import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinkedPatient, usePatientsStore } from '@/store/patients';
import { useShiftsStore } from '@/store/shifts';

function PatientCard({
  patient,
  isSelected,
  hasActiveShift,
  onPress,
}: {
  patient: LinkedPatient;
  isSelected: boolean;
  hasActiveShift: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {hasActiveShift && <View style={styles.activeDot} />}
      <Text style={[styles.cardName, isSelected && styles.cardNameSelected]} numberOfLines={1}>
        {patient.first_name} {patient.last_name}
      </Text>
      {patient.primary_condition ? (
        <Text style={styles.cardCondition} numberOfLines={1}>
          {patient.primary_condition}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export function PatientSelector() {
  const router = useRouter();
  const { patients, selectedPatientId, selectPatient } = usePatientsStore();
  const { activeShift } = useShiftsStore();

  if (patients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Henüz bağlı hastan yok.</Text>
        <Text style={styles.emptySubtitle}>İlk hastanı bağlayarak başla.</Text>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push('/onboarding/done')}
        >
          <Text style={styles.linkBtnText}>Hasta Bağla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (patients.length === 1) {
    const p = patients[0];
    const isActive = activeShift?.patient_id === p.patient_id;
    return (
      <View style={styles.singleChip}>
        {isActive && <View style={styles.activeDotSmall} />}
        <Text style={styles.singleName}>
          {p.first_name} {p.last_name}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={patients}
      keyExtractor={(item) => item.patient_id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <PatientCard
          patient={item}
          isSelected={selectedPatientId === item.patient_id}
          hasActiveShift={activeShift?.patient_id === item.patient_id}
          onPress={() => selectPatient(item.patient_id)}
        />
      )}
      ListFooterComponent={
        <TouchableOpacity
          style={styles.addCard}
          onPress={() => router.push('/onboarding/done')}
        >
          <Text style={styles.addCardText}>+</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  card: {
    minWidth: 140,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  cardSelected: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardNameSelected: { color: '#059669' },
  cardCondition: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addCard: {
    width: 48,
    height: '100%',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: { fontSize: 22, color: '#9CA3AF' },
  // Single patient
  singleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  singleName: { fontSize: 15, fontWeight: '600', color: '#059669' },
  // Empty state
  emptyContainer: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  linkBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  linkBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
