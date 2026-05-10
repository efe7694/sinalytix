import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePatientsStore } from '@/store/patients';

const BRAND = '#6366F1';

export default function DoneScreen() {
  const router = useRouter();
  const { patients } = usePatientsStore();

  const linkedPatient = patients[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Hazırsın.</Text>
        <Text style={styles.subtitle}>
          {linkedPatient
            ? `${linkedPatient.first_name} ${linkedPatient.last_name}'nın bakım ekibindesiniz.`
            : 'Hasta bağlayarak başlayabilirsiniz.'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(main)')}
        >
          <Text style={styles.primaryBtnText}>Uygulamaya Geç</Text>
        </TouchableOpacity>

        {!linkedPatient && (
          <TouchableOpacity
            onPress={() => router.push('/onboarding/connect')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Bir Hasta Bağla</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  actions: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: BRAND, fontSize: 15, fontWeight: '600' },
});
