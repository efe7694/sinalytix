import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Bakım sürecini profesyonelleştir.',
    subtitle: 'Görevler, vardiyalar ve hasta koordinasyonu tek platformda.',
  },
  {
    id: '2',
    title: 'Hastanın, ailesi ve sen — tek platformda.',
    subtitle: 'Gerçek zamanlı senkronizasyon ile herkes aynı sayfada.',
  },
  {
    id: '3',
    title: '⚠ Acil durumlarda 911\'i arayın.',
    subtitle:
      'Sinalytix acil doktor servisi değildir. Klinik karar verme aracı değildir. Bakım koordinasyonu ve görev yönetimi aracıdır.',
    isSafety: true,
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const { setStep } = useOnboardingStore();
  const { setDevSession } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleStart();
    }
  };

  const handleSkip = () => handleStart();

  const handleStart = () => {
    setStep('language');
    router.push('/onboarding/language');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, item.isSafety && styles.safetySlide]}>
            <Text style={[styles.title, item.isSafety && styles.safetyTitle]}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, item.isSafety && styles.safetySubtitle]}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryBtnText}>{isLast ? 'Başla' : 'Devam'}</Text>
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Geç</Text>
          </TouchableOpacity>
        )}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devBtn}
            onPress={async () => { await setDevSession(); router.replace('/(main)'); }}
          >
            <Text style={styles.devLabel}>🛠 Dev Girişi</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  safetySlide: { backgroundColor: '#FEF3C7' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  safetyTitle: { color: '#92400E' },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  safetySubtitle: { color: '#78350F' },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#059669' },
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#6B7280', fontSize: 14 },
  devBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
  },
  devLabel: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
