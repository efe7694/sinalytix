/**
 * SinaModal — Voice AI agent interaction overlay.
 *
 * State machine:
 *   idle → recording → processing → [blocked | general_life | panel | symptom_flow | red_panel]
 *   red_panel → red_calling → red_911_confirm
 *
 * Safety invariants (absolute, never relaxed):
 *   1. 911 is only dialed when user explicitly taps "Evet, 9-1-1'i Ara".
 *   2. MEDICAL_ADVICE judge output never reaches the user as clinical content.
 *      The blocked_message from the backend is used verbatim; no LLM text shown.
 *   3. Green auto-confirm (10s) only applies to non-medication, non-SOS actions.
 *      The server sets auto_confirm_after_sec; the client trusts it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import {
  useSinaStore,
  ProposedAction,
  SinaResponse,
  ClarificationAnswers,
} from '@/store/sina';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING, TOUCH_TARGET } from '@sinalytix/ui';

// ── Types ────────────────────────────────────────────────────────────────────

type ScreenState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'blocked'
  | 'general_life'
  | 'panel'
  | 'symptom_flow'
  | 'red_panel'
  | 'red_calling'
  | 'red_911_confirm'
  | 'done';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_RECORD_SEC = 45;
const SILENCE_DB_THRESHOLD = -50;
const SILENCE_DURATION_MS = 3500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(risk: 'green' | 'yellow' | 'red'): string {
  if (risk === 'green') return COLORS.success;
  if (risk === 'yellow') return COLORS.warning;
  return COLORS.sos;
}

function riskBg(risk: 'green' | 'yellow' | 'red'): string {
  if (risk === 'green') return '#F0FDF4';
  if (risk === 'yellow') return '#FFFBEB';
  return '#FEF2F2';
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose(): void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SinaModal({ visible, onClose }: Props) {
  const { createSession, submitAudio, executeAction, cancelSession, triggerRedEscalation, pollEscalationStatus } =
    useSinaStore();

  const [screen, setScreen] = useState<ScreenState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [response, setResponse] = useState<SinaResponse | null>(null);
  const [action, setAction] = useState<ProposedAction | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [recordSec, setRecordSec] = useState(0);
  const [symptomAnswers, setSymptomAnswers] = useState<ClarificationAnswers>({ q1_answer: null, q2_answer: null });
  const [symptomStep, setSymptomStep] = useState<0 | 1>(0);
  const [symptomInput, setSymptomInput] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    countdownTimerRef.current = null;
    recordTimerRef.current = null;
    silenceTimerRef.current = null;
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setScreen('idle');
      setSessionId(null);
      setResponse(null);
      setAction(null);
      setErrorText(null);
      setRecordSec(0);
      setSymptomAnswers({ q1_answer: null, q2_answer: null });
      setSymptomStep(0);
      setSymptomInput('');
    } else {
      clearAllTimers();
      stopRecording();
    }
  }, [visible]);

  // ── Recording ──────────────────────────────────────────────────────────────

  async function stopRecording(): Promise<string | null> {
    const rec = recordingRef.current;
    if (!rec) return null;
    recordingRef.current = null;
    clearAllTimers();
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return rec.getURI() ?? null;
    } catch {
      return null;
    }
  }

  async function startPTT() {
    setScreen('requesting_permission');
    setErrorText(null);

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setScreen('blocked');
      setResponse({
        session_id: '',
        proposed_action: null,
        clarification_questions: [],
        blocked_message: 'Mikrofon izni gerekli. Lütfen ayarlardan izin verin.',
        general_life_response: null,
      });
      return;
    }

    let sid: string;
    try {
      sid = await createSession('ptt');
      setSessionId(sid);
    } catch {
      setScreen('idle');
      setErrorText('Oturum başlatılamadı. Lütfen tekrar dene.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (!status.isRecording) return;

          // Silence detection
          const db = status.metering ?? -160;
          if (db < SILENCE_DB_THRESHOLD) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                handleStopAndSubmit(sid);
              }, SILENCE_DURATION_MS);
            }
          } else {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          }
        },
        100,
      );

      recordingRef.current = recording;
      setScreen('recording');
      setRecordSec(0);

      // Visual counter
      recordTimerRef.current = setInterval(() => {
        setRecordSec((s) => {
          if (s + 1 >= MAX_RECORD_SEC) {
            handleStopAndSubmit(sid);
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setScreen('idle');
      setErrorText('Kayıt başlatılamadı. Tekrar dene.');
    }
  }

  async function handleStopAndSubmit(sid: string) {
    clearAllTimers();
    setScreen('processing');
    const uri = await stopRecording();
    if (!uri) {
      setScreen('idle');
      setErrorText('Kayıt alınamadı. Tekrar dene.');
      return;
    }
    await processAudio(sid, uri);
  }

  async function handlePTTRelease() {
    if (screen !== 'recording' || !sessionId) return;
    await handleStopAndSubmit(sessionId);
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────

  async function processAudio(sid: string, audioUri: string) {
    try {
      const res = await submitAudio(sid, audioUri);
      setResponse(res);
      routeResponse(res);
    } catch {
      setScreen('idle');
      setErrorText('İşlenemedi. Lütfen tekrar dene.');
    }
  }

  function routeResponse(res: SinaResponse) {
    const a = res.proposed_action;

    // MEDICAL_ADVICE / IRRELEVANT → blocked screen (no clinical content shown)
    if (!a || a.judge_category === 'MEDICAL_ADVICE' || a.judge_category === 'IRRELEVANT') {
      setScreen('blocked');
      return;
    }

    // GENERAL_LIFE → show response text + TTS
    if (a.judge_category === 'GENERAL_LIFE') {
      if (a.tts_text) Speech.speak(a.tts_text, { language: 'tr-TR' });
      setScreen('general_life');
      return;
    }

    // IN_SCOPE_ACTION
    setAction(a);

    // Symptom report needs clarification questions first
    if (a.action_type === 'SYMPTOM_REPORT_SEND' && res.clarification_questions.length > 0) {
      setScreen('symptom_flow');
      setSymptomStep(0);
      setSymptomInput('');
      return;
    }

    // Red risk → special escalation panel
    if (a.risk_level === 'red' || a.is_explicit_emergency) {
      setScreen('red_panel');
      startCountdown(a.auto_confirm_after_sec, handleRedTimeout);
      return;
    }

    // Green / Yellow panel
    showApprovalPanel(a);
  }

  function showApprovalPanel(a: ProposedAction) {
    setAction(a);
    setScreen('panel');
    if (a.tts_text) Speech.speak(a.tts_text, { language: 'tr-TR' });
    startCountdown(a.auto_confirm_after_sec, () => {
      if (a.risk_level === 'green') {
        handleConfirmAction(a);
      } else {
        handleCancelAction('timeout');
      }
    });
  }

  function startCountdown(seconds: number, onExpire: () => void) {
    clearAllTimers();
    setCountdown(seconds);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleConfirmAction(a?: ProposedAction, clarifications?: ClarificationAnswers) {
    clearAllTimers();
    Speech.stop();
    const target = a ?? action;
    if (!target) return;
    try {
      await executeAction(target.action_id, clarifications);
      setScreen('done');
      setTimeout(() => {
        if (target.action_type === 'CALL_TRIGGER_SOS' || target.action_type === 'CALL_TRIGGER_REGULAR') {
          // Calls handled via native dialer — close modal
        }
        onClose();
      }, 1200);
    } catch {
      setScreen('panel');
      setErrorText('Aksiyon uygulanamadı. Tekrar dene.');
    }
  }

  async function handleCancelAction(reason?: string) {
    clearAllTimers();
    Speech.stop();
    if (sessionId) await cancelSession(sessionId, reason).catch(() => {});
    onClose();
  }

  // ── Symptom Flow ───────────────────────────────────────────────────────────

  function handleSymptomAnswer() {
    const trimmed = symptomInput.trim();
    if (symptomStep === 0) {
      setSymptomAnswers((prev) => ({ ...prev, q1_answer: trimmed || null }));
      setSymptomStep(1);
      setSymptomInput('');
    } else {
      const finalAnswers: ClarificationAnswers = {
        ...symptomAnswers,
        q2_answer: trimmed || null,
      };
      setSymptomAnswers(finalAnswers);
      // Proceed to approval panel with collected answers
      const a = action!;
      setScreen('panel');
      if (a.tts_text) Speech.speak(a.tts_text, { language: 'tr-TR' });
      startCountdown(a.auto_confirm_after_sec, () => handleCancelAction('timeout'));
    }
  }

  function handleSymptomConfirm() {
    clearAllTimers();
    Speech.stop();
    if (!action) return;
    const finalAnswers: ClarificationAnswers = {
      q1_answer: symptomAnswers.q1_answer,
      q2_answer: symptomAnswers.q2_answer,
    };
    handleConfirmAction(action, finalAnswers);
  }

  // ── Red Escalation ─────────────────────────────────────────────────────────

  async function handleRedTimeout() {
    if (!sessionId) return;
    setScreen('red_calling');
    try {
      await triggerRedEscalation(sessionId);
      // Poll for round-1 result (max 90s in backend; we wait then show 911 screen)
      await waitForEscalationResult(sessionId);
    } catch {
      setScreen('red_911_confirm');
    }
  }

  async function waitForEscalationResult(sid: string) {
    // Poll up to 90s for family answer; then show 911 confirmation regardless
    const maxAttempts = 18; // 18 × 5s = 90s
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(5000);
      try {
        const status = await pollEscalationStatus(sid);
        if (status.family_answered) {
          setScreen('done');
          setTimeout(onClose, 1500);
          return;
        }
        if (status.family_round1_called && !status.family_answered) {
          setScreen('red_911_confirm');
          return;
        }
      } catch {
        // Continue polling on transient errors
      }
    }
    setScreen('red_911_confirm');
  }

  async function handleCallFamily() {
    clearAllTimers();
    if (sessionId) await triggerRedEscalation(sessionId).catch(() => {});
    onClose();
  }

  // 911 is only dialed here — explicit user tap, no other path reaches this
  async function handleConfirm911() {
    clearAllTimers();
    Linking.openURL('tel:911');
    onClose();
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderRecording() {
    return (
      <View style={styles.centeredBody}>
        <View style={styles.micPulse}>
          <Ionicons name="mic" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.stateLabel}>Dinliyorum...</Text>
        <Text style={styles.stateHint}>
          {recordSec}s / {MAX_RECORD_SEC}s — sessiz kaldığında otomatik gönderilir
        </Text>
        <TouchableOpacity style={styles.stopBtn} onPress={handlePTTRelease} activeOpacity={0.8}>
          <Ionicons name="stop-circle" size={22} color={COLORS.error} />
          <Text style={styles.stopBtnLabel}>Gönder</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderProcessing() {
    return (
      <View style={styles.centeredBody}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.stateLabel}>Çözümleniyor...</Text>
      </View>
    );
  }

  function renderBlocked() {
    const msg =
      response?.blocked_message ??
      'Bu konuda sana yardımcı olamam. Doktoruna veya eczacına sorabilirsin. Ailenle paylaşmamı ister misin?';
    return (
      <View style={styles.centeredBody}>
        <View style={styles.blockedIcon}>
          <Ionicons name="shield-outline" size={36} color={COLORS.textSecondary} />
        </View>
        <Text style={styles.blockedMsg}>{msg}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeBtnLabel}>Tamam</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderGeneralLife() {
    const a = response?.proposed_action;
    const text = a?.tts_text ?? a?.action_summary ?? '';
    return (
      <View style={styles.centeredBody}>
        <Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.primary} />
        <Text style={styles.generalLifeText}>{text}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeBtnLabel}>Tamam</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderPanel() {
    if (!action) return null;
    const risk = action.risk_level;
    const color = riskColor(risk);
    const bg = riskBg(risk);
    const isGreen = risk === 'green';

    return (
      <View style={[styles.panel, { backgroundColor: bg, borderColor: color }]}>
        {/* Header */}
        <View style={[styles.panelHeader, { backgroundColor: color }]}>
          <Text style={styles.panelHeaderText}>
            {isGreen ? 'Onay' : risk === 'yellow' ? 'Onay Gerekiyor' : 'Dikkat'}
          </Text>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownBadgeText}>{countdown}s</Text>
          </View>
        </View>

        <ScrollView style={styles.panelBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.panelFieldLabel}>Anladığım:</Text>
          <Text style={styles.panelFieldValue}>{action.summary}</Text>

          <View style={styles.panelDivider} />

          <Text style={styles.panelFieldLabel}>Yapacağım:</Text>
          <Text style={[styles.panelFieldValue, { color }]}>{action.action_summary}</Text>

          {isGreen && (
            <Text style={styles.autoConfirmNote}>
              {countdown} saniye içinde iptal etmezseniz otomatik uygulanır.
            </Text>
          )}
          {!isGreen && (
            <Text style={styles.autoCancelNote}>
              {countdown} saniye içinde onaylanmazsa iptal edilir.
            </Text>
          )}
        </ScrollView>

        {/* CTA row */}
        <View style={styles.panelActions}>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnConfirm, { backgroundColor: color }]}
            onPress={() => handleConfirmAction()}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
            <Text style={styles.panelBtnLabel}>Onayla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnCancel]}
            onPress={() => handleCancelAction('user')}
            activeOpacity={0.8}
          >
            <Text style={[styles.panelBtnLabel, { color: COLORS.textSecondary }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSymptomFlow() {
    if (!response?.clarification_questions) return null;
    const questions = response.clarification_questions;
    const question = questions[symptomStep] ?? '';
    const isLast = symptomStep === questions.length - 1 || symptomStep === 1;

    return (
      <View style={styles.symptomContainer}>
        <View style={styles.symptomHeader}>
          <Ionicons name="pulse-outline" size={24} color={COLORS.warning} />
          <Text style={styles.symptomTitle}>Semptom Bildirimi</Text>
          <Text style={styles.symptomStep}>{symptomStep + 1} / {Math.min(questions.length, 2)}</Text>
        </View>

        <Text style={styles.symptomQuestion}>{question}</Text>

        <TextInput
          style={styles.symptomInput}
          value={symptomInput}
          onChangeText={setSymptomInput}
          placeholder="Cevabınız..."
          placeholderTextColor={COLORS.textDisabled}
          multiline
          maxLength={500}
          autoFocus
        />

        <View style={styles.panelActions}>
          {isLast ? (
            <TouchableOpacity
              style={[styles.panelBtn, styles.panelBtnConfirm, { backgroundColor: COLORS.warning }]}
              onPress={handleSymptomConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.panelBtnLabel}>Gönder</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.panelBtn, styles.panelBtnConfirm, { backgroundColor: COLORS.warning }]}
              onPress={handleSymptomAnswer}
              activeOpacity={0.85}
            >
              <Text style={styles.panelBtnLabel}>Devam</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnCancel]}
            onPress={() => handleCancelAction('user')}
            activeOpacity={0.8}
          >
            <Text style={[styles.panelBtnLabel, { color: COLORS.textSecondary }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderRedPanel() {
    return (
      <View style={[styles.panel, { backgroundColor: '#FEF2F2', borderColor: COLORS.sos }]}>
        <View style={[styles.panelHeader, { backgroundColor: COLORS.sos }]}>
          <Text style={styles.panelHeaderText}>Acil Durum</Text>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownBadgeText}>{countdown}s</Text>
          </View>
        </View>

        <View style={styles.panelBody}>
          <Text style={styles.redMessage}>
            9-1-1 yalnızca gerçek acil durumlar içindir.{'\n\n'}
            Aileni şimdi arayalım mı?
          </Text>
          <Text style={styles.redNote}>
            {countdown} saniye içinde seçim yapılmazsa aile bildirim alacak.
          </Text>
        </View>

        <View style={styles.panelActions}>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnConfirm, { backgroundColor: COLORS.sos }]}
            onPress={handleCallFamily}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.panelBtnLabel}>Aileyi Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnCancel]}
            onPress={() => handleCancelAction('user')}
            activeOpacity={0.8}
          >
            <Text style={[styles.panelBtnLabel, { color: COLORS.textSecondary }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderRedCalling() {
    return (
      <View style={styles.centeredBody}>
        <ActivityIndicator color={COLORS.sos} size="large" />
        <Text style={[styles.stateLabel, { color: COLORS.sos }]}>Aile aranıyor...</Text>
        <Text style={styles.stateHint}>Lütfen bekleyin</Text>
      </View>
    );
  }

  function renderRed911Confirm() {
    return (
      <View style={[styles.panel, { backgroundColor: '#FEF2F2', borderColor: COLORS.sos }]}>
        <View style={[styles.panelHeader, { backgroundColor: COLORS.sos }]}>
          <Text style={styles.panelHeaderText}>Aileye Ulaşılamadı</Text>
        </View>

        <View style={styles.panelBody}>
          <Text style={styles.redMessage}>9-1-1'i aramamı ister misin?</Text>
          <Text style={styles.redNote}>
            Bu seçeneği yalnızca gerçek bir acil durumda kullanın.
          </Text>
        </View>

        {/* 911 button only exists in this explicit-confirmation screen */}
        <View style={styles.panelActions}>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnConfirm, { backgroundColor: COLORS.sos }]}
            onPress={handleConfirm911}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.panelBtnLabel}>Evet, 9-1-1'i Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.panelBtn, styles.panelBtnCancel]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.panelBtnLabel, { color: COLORS.textSecondary }]}>Hayır, İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderDone() {
    return (
      <View style={styles.centeredBody}>
        <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
        <Text style={styles.stateLabel}>Uygulandı</Text>
      </View>
    );
  }

  function renderIdle() {
    return (
      <View style={styles.centeredBody}>
        {errorText && <Text style={styles.errorText}>{errorText}</Text>}
        <Pressable
          style={({ pressed }) => [styles.ptbBtn, pressed && styles.ptbBtnPressed]}
          onPress={startPTT}
          accessibilityLabel="Konuşmak için bas"
          accessibilityRole="button"
        >
          <Ionicons name="mic" size={40} color="#FFF" />
        </Pressable>
        <Text style={styles.stateLabel}>Sina'ya söyle</Text>
        <Text style={styles.stateHint}>Butona bas ve konuş</Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderBody() {
    switch (screen) {
      case 'idle':
      case 'requesting_permission':
        return renderIdle();
      case 'recording':
        return renderRecording();
      case 'processing':
        return renderProcessing();
      case 'blocked':
        return renderBlocked();
      case 'general_life':
        return renderGeneralLife();
      case 'panel':
        return renderPanel();
      case 'symptom_flow':
        return renderSymptomFlow();
      case 'red_panel':
        return renderRedPanel();
      case 'red_calling':
        return renderRedCalling();
      case 'red_911_confirm':
        return renderRed911Confirm();
      case 'done':
        return renderDone();
    }
  }

  const canDismiss = ['idle', 'blocked', 'general_life', 'done'].includes(screen);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={canDismiss ? onClose : undefined}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sinaTag}>
              <Ionicons name="sparkles" size={14} color={COLORS.primary} />
              <Text style={styles.sinaTagText}>Sina</Text>
            </View>
            {canDismiss && (
              <TouchableOpacity style={styles.dismissBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          {renderBody()}
        </View>
      </View>
    </Modal>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: 380,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
  },
  sinaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    backgroundColor: COLORS.surfaceSelected,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.FULL,
  },
  sinaTagText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dismissBtn: {
    width: TOUCH_TARGET.MINIMUM,
    height: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centeredBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
    gap: SPACING.LG,
    minHeight: 300,
  },
  stateLabel: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.error,
    textAlign: 'center',
  },

  micPulse: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceSelected,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  stopBtnLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.error,
  },

  ptbBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ptbBtnPressed: {
    transform: [{ scale: 0.94 }],
    shadowOpacity: 0.2,
  },

  blockedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedMsg: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  generalLifeText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },

  closeBtn: {
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnLabel: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Panel
  panel: {
    margin: SPACING.LG,
    marginBottom: SPACING.XL,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 2,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  panelHeaderText: {
    fontSize: FONT_SIZE.BODY,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
  },
  countdownBadgeText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
    color: '#FFF',
  },
  panelBody: {
    padding: SPACING.LG,
    flexGrow: 0,
  },
  panelFieldLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
    color: COLORS.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.XS,
  },
  panelFieldValue: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  panelDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.MD,
  },
  autoConfirmNote: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.success,
    fontStyle: 'italic',
  },
  autoCancelNote: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
  },
  panelActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
    padding: SPACING.LG,
    paddingTop: SPACING.SM,
  },
  panelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.XS,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.MD,
  },
  panelBtnConfirm: {
    flex: 2,
  },
  panelBtnCancel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  panelBtnLabel: {
    fontSize: FONT_SIZE.BUTTON,
    fontWeight: '700',
    color: '#FFF',
  },

  // Symptom flow
  symptomContainer: {
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  symptomTitle: {
    flex: 1,
    fontSize: FONT_SIZE.BODY,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  symptomStep: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
  },
  symptomQuestion: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  symptomInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZE.BODY,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Red
  redMessage: {
    fontSize: FONT_SIZE.H3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  redNote: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
