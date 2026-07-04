/**
 * SOS two-phase escalation overlay.
 *
 * Phase 1 (10s): calls EC #1 via native dialer.
 * Phase 2 (30s): triggered when app returns to foreground after the dialer.
 *   Calls 911 if not cancelled.
 *
 * AppState 'active' transition during phase 1 advances to phase 2.
 * This is intentional: the app cannot know if the call was answered.
 *
 * Audio (Ton A / Ton B): requires expo-av — pending V1 implementation.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useCallsStore } from '@/store/calls';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';

const PHASE1_SECONDS = 10;
const PHASE2_SECONDS = 30;

// Distinct vibration patterns for phase 1 vs phase 2
const VIB_PHASE1 = [0, 400, 200, 400];
const VIB_PHASE2 = [0, 800, 200, 800, 200, 800];

interface Props {
  visible: boolean;
  ecPhone: string | null;
  ecName: string | null;
  ecId: string | null;
  onClose(): void;
}

export default function SOSPopup({ visible, ecPhone, ecName, ecId, onClose }: Props) {
  const { logCall } = useCallsStore();
  const [phase, setPhase] = useState<1 | 2>(1);
  const [countdown, setCountdown] = useState(PHASE1_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<1 | 2>(1);
  const dialedRef = useRef(false);

  // Keep phaseRef in sync so AppState handler always reads current phase
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (seconds: number, onExpire: () => void) => {
      clearTimer();
      setCountdown(seconds);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearTimer();
            onExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer],
  );

  const enterPhase2 = useCallback(() => {
    setPhase(2);
    setCountdown(PHASE2_SECONDS);
    Vibration.vibrate(VIB_PHASE2, true);
    startCountdown(PHASE2_SECONDS, async () => {
      Vibration.cancel();
      await logCall({
        call_type: 'sos',
        target_type: 'emergency_services',
        status: 'initiated',
      });
      Linking.openURL('tel:911');
      onClose();
    });
  }, [logCall, onClose, startCountdown]);

  // When the app returns to foreground after phase 1, advance to phase 2
  const handleAppState = useCallback(
    (nextState: AppStateStatus) => {
      if (nextState === 'active' && phaseRef.current === 1 && dialedRef.current) {
        dialedRef.current = false;
        enterPhase2();
      }
    },
    [enterPhase2],
  );

  useEffect(() => {
    if (!visible) return;

    // Reset on each open
    dialedRef.current = false;
    setPhase(1);

    Vibration.vibrate(VIB_PHASE1, true);

    startCountdown(PHASE1_SECONDS, async () => {
      Vibration.cancel();
      if (!ecPhone) {
        // No EC configured — skip family call and go straight to phase 2
        enterPhase2();
        return;
      }
      await logCall({
        call_type: 'sos',
        target_type: 'family',
        target_id: ecId ?? undefined,
        status: 'initiated',
      });
      dialedRef.current = true;
      Linking.openURL(`tel:${ecPhone}`);
      // Phase 2 starts when user returns to app (AppState handler)
    });

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
      clearTimer();
      Vibration.cancel();
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally re-runs only on open

  async function handleCancel() {
    clearTimer();
    Vibration.cancel();
    const cancelStage = phase === 1 ? 'pre_family_10s' : 'pre_911_30s';
    await logCall({
      call_type: 'sos',
      target_type: phase === 1 ? 'family' : 'emergency_services',
      status: 'cancelled',
      cancel_stage: cancelStage,
    });
    onClose();
  }

  if (!visible) return null;

  const isPhase2 = phase === 2;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={styles.topSection}>
          <Text style={styles.sosLabel}>SOS</Text>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          {isPhase2 ? (
            <>
              <Text style={styles.messageHeading}>Aileye Ulaşılamadı</Text>
              <Text style={styles.messageBody}>
                {countdown} saniye içinde iptal etmezseniz{'\n'}
                <Text style={styles.messageEmphasis}>911 aranacak.</Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.messageHeading}>
                {ecName ? `${ecName} aranacak` : 'Acil kişiniz aranacak'}
              </Text>
              <Text style={styles.messageBody}>
                {countdown} saniye içinde iptal etmezseniz{'\n'}arama başlar.
              </Text>
            </>
          )}
        </View>

        {/* Phase 2 warning banner */}
        {isPhase2 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>⚠️  Acil servisler aranıyor</Text>
          </View>
        )}

        {/* Cancel — single large CTA */}
        <View style={styles.cancelSection}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.85}
            accessibilityLabel="İptal et"
            accessibilityRole="button"
          >
            <Text style={styles.cancelLabel}>İPTAL</Text>
          </TouchableOpacity>
          <Text style={styles.cancelHint}>
            {isPhase2
              ? 'Bu tuşa basarak 911 aramasını iptal edebilirsiniz'
              : 'Bu tuşa basarak aramayı iptal edebilirsiniz'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.sos,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: SPACING.XL,
  },

  topSection: {
    alignItems: 'center',
    gap: SPACING.LG,
  },
  sosLabel: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFF',
  },

  messageSection: {
    alignItems: 'center',
    gap: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  messageHeading: {
    fontSize: FONT_SIZE.H2,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  messageBody: {
    fontSize: FONT_SIZE.H3,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
  },
  messageEmphasis: {
    fontWeight: '800',
    color: '#FFF',
  },

  warningBanner: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    alignItems: 'center',
  },
  warningText: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },

  cancelSection: {
    gap: SPACING.MD,
    alignItems: 'center',
  },
  cancelBtn: {
    width: '100%',
    minHeight: 80,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelLabel: {
    fontSize: FONT_SIZE.H1,
    fontWeight: '900',
    color: COLORS.sos,
    letterSpacing: 2,
  },
  cancelHint: {
    fontSize: FONT_SIZE.CAPTION,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});
