import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  step?: number;
  totalSteps?: number;
  scrollable?: boolean;
}

export default function OnboardingScreen({
  children,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  step,
  totalSteps,
  scrollable = false,
}: Props) {
  const content = (
    <>
      {step !== undefined && totalSteps !== undefined && (
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < step && styles.progressSegmentActive]}
            />
          ))}
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.inner}>{content}</View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, primaryDisabled && styles.primaryBtnDisabled]}
            onPress={onPrimary}
            disabled={primaryDisabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryLabel, primaryDisabled && styles.primaryLabelDisabled]}>
              {primaryLabel}
            </Text>
          </TouchableOpacity>
          {secondaryLabel && onSecondary ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.7}>
              <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: SPACING.LG, paddingTop: SPACING.XL },
  scroll: { paddingHorizontal: SPACING.LG, paddingTop: SPACING.XL, paddingBottom: SPACING.LG },

  progressRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG + SPACING.SM,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceElevated,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primary,
  },

  title: {
    fontSize: FONT_SIZE.H1,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.SM,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.LG,
  },
  body: { flex: 1 },

  footer: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XL,
    paddingTop: SPACING.MD,
    gap: SPACING.SM,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.LG,
    minHeight: TOUCH_TARGET.PREFERRED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: COLORS.surfaceElevated,
  },
  primaryLabel: {
    fontSize: FONT_SIZE.BUTTON,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryLabelDisabled: {
    color: COLORS.textDisabled,
  },
  secondaryBtn: {
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
  },
});
