import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useShiftsStore } from '@/store/shifts';

const MAX_NOTE = 500;

interface CheckoutBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CheckoutBottomSheet({ visible, onClose }: CheckoutBottomSheetProps) {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { checkOut } = useShiftsStore();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleFinish = async (skipNote = false) => {
    setIsLoading(true);
    try {
      await checkOut(skipNote ? undefined : note.trim() || undefined);
      setNote('');
      onClose();
    } catch {
      // error handled by store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.handle} />
          <Text style={styles.title}>Vardiya Notu</Text>
          <Text style={styles.subtitle}>
            Opsiyonel — sonraki bakıcı ve aile için not ekle.
          </Text>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={(v) => setNote(v.slice(0, MAX_NOTE))}
            placeholder="Vardiya notu ekle... (opsiyonel)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length} / {MAX_NOTE}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={() => handleFinish(false)}
            disabled={isLoading}
          >
            <Text style={styles.primaryBtnText}>Vardiyayı Bitir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => handleFinish(true)}>
            <Text style={styles.skipText}>Notu Geç</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  noteInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    marginBottom: 6,
  },
  charCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginBottom: 16 },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#9CA3AF', fontSize: 15 },
});
