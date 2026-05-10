import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTasksStore } from '@/store/tasks';

export function UndoBar() {
  const { pendingUndo, undoLast } = useTasksStore();
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (pendingUndo) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 100, duration: 200, useNativeDriver: true }).start();
    }
  }, [pendingUndo]);

  if (!pendingUndo) return null;

  return (
    <Animated.View style={[styles.bar, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text} numberOfLines={1}>
        Görev tamamlandı
      </Text>
      <TouchableOpacity onPress={undoLast} style={styles.undoBtn}>
        <Text style={styles.undoBtnText}>Geri Al</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  text: { flex: 1, color: '#F9FAFB', fontSize: 14 },
  undoBtn: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  undoBtnText: { color: '#6EE7B7', fontSize: 14, fontWeight: '700' },
});
