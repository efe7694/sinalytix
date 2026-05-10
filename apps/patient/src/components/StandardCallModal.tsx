import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallsStore, CallAvailability } from '@/store/calls';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';

const AUTO_CLOSE_SECONDS = 30;

interface Props {
  visible: boolean;
  availability: CallAvailability;
  onClose(): void;
}

export default function StandardCallModal({ visible, availability, onClose }: Props) {
  const { logCall } = useCallsStore();
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;

    setCountdown(AUTO_CLOSE_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          logCall({
            call_type: 'regular',
            target_type: 'family',
            status: 'cancelled',
            cancel_stage: 'regular_modal_timeout',
          });
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleCallCaregiver() {
    if (!availability.caregiver_phone) return;
    clearTimer();
    await logCall({
      call_type: 'regular',
      target_type: 'caregiver',
      status: 'initiated',
    });
    Linking.openURL(`tel:${availability.caregiver_phone}`);
    onClose();
  }

  async function handleCallFamily() {
    if (!availability.family_phone) return;
    clearTimer();
    await logCall({
      call_type: 'regular',
      target_type: 'family',
      status: 'initiated',
    });
    Linking.openURL(`tel:${availability.family_phone}`);
    onClose();
  }

  async function handleCancel() {
    clearTimer();
    await logCall({
      call_type: 'regular',
      target_type: 'family',
      status: 'cancelled',
      cancel_stage: 'regular_user_cancelled',
    });
    onClose();
  }

  const caregiverActive = availability.caregiver_available && !!availability.caregiver_phone;
  const familyActive = availability.family_available && !!availability.family_phone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Kimi Aramak İstersiniz?</Text>
            <Text style={styles.subtitle}>Otomatik kapanma: {countdown}sn</Text>
          </View>

          {/* Caregiver button */}
          <TouchableOpacity
            style={[styles.callBtn, !caregiverActive && styles.callBtnDisabled]}
            onPress={caregiverActive ? handleCallCaregiver : undefined}
            activeOpacity={caregiverActive ? 0.8 : 1}
            accessibilityRole="button"
            accessibilityState={{ disabled: !caregiverActive }}
          >
            <View style={[styles.callBtnIcon, !caregiverActive && styles.callBtnIconDisabled]}>
              <Ionicons
                name="person-outline"
                size={24}
                color={caregiverActive ? '#FFF' : COLORS.textDisabled}
              />
            </View>
            <View style={styles.callBtnText}>
              <Text style={[styles.callBtnLabel, !caregiverActive && styles.callBtnLabelDisabled]}>
                {availability.caregiver_name ?? 'Bakıcı'}
              </Text>
              {!caregiverActive && (
                <Text style={styles.callBtnHint}>Aktif vardiya yok</Text>
              )}
            </View>
            {caregiverActive && (
              <Ionicons name="call" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          {/* Family button */}
          <TouchableOpacity
            style={[styles.callBtn, !familyActive && styles.callBtnDisabled]}
            onPress={familyActive ? handleCallFamily : undefined}
            activeOpacity={familyActive ? 0.8 : 1}
            accessibilityRole="button"
            accessibilityState={{ disabled: !familyActive }}
          >
            <View style={[styles.callBtnIcon, !familyActive && styles.callBtnIconDisabled]}>
              <Ionicons
                name="people-outline"
                size={24}
                color={familyActive ? '#FFF' : COLORS.textDisabled}
              />
            </View>
            <View style={styles.callBtnText}>
              <Text style={[styles.callBtnLabel, !familyActive && styles.callBtnLabelDisabled]}>
                {availability.family_name ?? 'Aile Üyesi'}
              </Text>
              {!familyActive && (
                <Text style={styles.callBtnHint}>Rahatsız etme modu açık</Text>
              )}
            </View>
            {familyActive && (
              <Ionicons name="call" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelLabel}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.LG,
    paddingBottom: 36,
    gap: SPACING.SM,
  },

  header: {
    alignItems: 'center',
    paddingBottom: SPACING.MD,
    gap: SPACING.XS,
  },
  title: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
  },

  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  callBtnDisabled: {
    borderColor: COLORS.border,
    opacity: 0.65,
  },
  callBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  callBtnIconDisabled: {
    backgroundColor: COLORS.border,
  },
  callBtnText: { flex: 1, gap: 2 },
  callBtnLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  callBtnLabelDisabled: { color: COLORS.textDisabled },
  callBtnHint: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
  },

  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.PREFERRED,
    marginTop: SPACING.XS,
  },
  cancelLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
