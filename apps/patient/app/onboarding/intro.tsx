import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    title: 'Evde bakım artık herkes için daha kolay.',
    body: 'Sevdiklerinizin yanında olmak için tasarlandı.',
  },
  {
    key: '2',
    title: 'Aile, bakıcı ve sağlık ekibin tek ekranda.',
    body: 'Herkes aynı gerçeği görür, hiçbir şey kaçmaz.',
  },
  {
    key: '3',
    title: 'Acil doktor servisi değildir.',
    body: 'Acil durumlarda lütfen 911\'i arayın.',
    isWarning: true,
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const { setStep } = useOnboardingStore();
  const { setDevSession } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      advance();
    }
  }

  function advance() {
    setStep('language');
    router.push('/onboarding/language');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.skipBtn} onPress={advance}>
        <Text style={styles.skipLabel}>Geç</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconPlaceholder, item.isWarning && styles.iconWarning]} />
            <Text style={[styles.slideTitle, item.isWarning && styles.slideTitleWarning]}>
              {item.title}
            </Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.8}>
          <Text style={styles.primaryLabel}>
            {activeIndex === SLIDES.length - 1 ? 'Başla' : 'Devam'}
          </Text>
        </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  skipBtn: {
    alignSelf: 'flex-end',
    padding: SPACING.MD,
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
  },
  skipLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary },
  slide: {
    width,
    paddingHorizontal: SPACING.XL,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: SPACING.MD,
  },
  iconPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.LG,
  },
  iconWarning: { backgroundColor: COLORS.sosBackground },
  slideTitle: {
    fontSize: FONT_SIZE.H1,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
  slideTitleWarning: { color: COLORS.error },
  slideBody: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XL,
    gap: SPACING.MD,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: SPACING.XS, marginBottom: SPACING.SM },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.LG,
    minHeight: TOUCH_TARGET.PREFERRED,
    paddingHorizontal: SPACING.XL,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '600', color: '#FFF' },
  devBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    marginTop: SPACING.XS,
  },
  devLabel: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
