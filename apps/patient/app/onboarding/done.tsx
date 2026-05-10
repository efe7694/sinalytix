import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

export default function DoneScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={styles.title}>Hazırsın.</Text>
        <Text style={styles.subtitle}>Profilini dilediğinde tamamlayabilirsin.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(main)')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryLabel}>Uygulamaya Geç</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(main)/profile')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryLabel}>Profilimi Şimdi Tamamla</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    gap: SPACING.MD,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  iconText: { fontSize: 48, color: '#FFF' },
  title: { fontSize: FONT_SIZE.H1, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  footer: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XL,
    gap: SPACING.SM,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.LG,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { fontSize: FONT_SIZE.BUTTON, fontWeight: '600', color: '#FFF' },
  secondaryBtn: {
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: FONT_SIZE.BODY, color: COLORS.primary, fontWeight: '500' },
});
