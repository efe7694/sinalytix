import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/store/tasks';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET, SHADOW } from '@sinalytix/ui';

const ACTOR_LABEL: Record<string, string> = {
  patient: 'Sen',
  caregiver: 'Bakıcı',
  family: 'Aile',
  system: 'Sistem',
  agent: 'Sina',
};

interface Props {
  task: Task;
  canUndo: boolean;
  onComplete(): void;
  onUndo(): void;
  onSkip(): void;
  onIncrement(): void;
}

export default function TaskItem({ task, canUndo, onComplete, onUndo, onSkip, onIncrement }: Props) {
  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';
  const isTodo = task.status === 'todo';
  const isCounter = task.type === 'counter';
  const isMedication = task.subtype === 'medication';

  const count = task.progress_count ?? 0;
  const target = task.target_per_day ?? 1;
  const progressRatio = isCounter ? Math.min(count / target, 1) : 0;

  const accentColor = isDone ? COLORS.secondary : isSkipped ? COLORS.border : COLORS.primary;

  return (
    <View style={[styles.card, isDone && styles.cardDone, isSkipped && styles.cardSkipped]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>
        {isCounter ? (
          <TouchableOpacity
            style={[styles.squareBtn, isDone ? styles.squareBtnDone : styles.squareBtnCounter]}
            onPress={isDone ? undefined : onIncrement}
            disabled={isDone}
            activeOpacity={0.7}
          >
            {isDone ? (
              <Ionicons name="checkmark" size={20} color="#FFF" />
            ) : (
              <Text style={styles.counterText}>{count}/{target}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.squareBtn,
              isDone && styles.squareBtnDone,
              isSkipped && styles.squareBtnSkipped,
            ]}
            onPress={isTodo ? onComplete : undefined}
            disabled={!isTodo}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
          >
            {isDone && <Ionicons name="checkmark" size={20} color="#FFF" />}
            {isSkipped && <Ionicons name="remove" size={18} color={COLORS.textDisabled} />}
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <Text
            style={[styles.title, (isDone || isSkipped) && styles.titleDimmed]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {isCounter && !isDone && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` as any }]} />
            </View>
          )}

          <View style={styles.meta}>
            {isMedication && (
              <View style={styles.badge}>
                <Ionicons name="medical" size={10} color={COLORS.secondary} />
                <Text style={styles.badgeLabel}>İlaç</Text>
              </View>
            )}
            <Text style={styles.actorLabel}>
              {ACTOR_LABEL[task.created_by_actor_type] ?? task.created_by_actor_type}
            </Text>
          </View>
        </View>

        {isTodo && !isCounter && (
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip} hitSlop={8}>
            <Text style={styles.skipLabel}>Atla</Text>
          </TouchableOpacity>
        )}
      </View>

      {canUndo && isDone && (
        <TouchableOpacity style={styles.undoRow} onPress={onUndo} activeOpacity={0.7}>
          <Ionicons name="arrow-undo-outline" size={14} color={COLORS.secondary} />
          <Text style={styles.undoLabel}>Geri Al</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    flexDirection: 'column',
    ...SHADOW.SM,
  },
  cardDone: { opacity: 0.72 },
  cardSkipped: { opacity: 0.5 },

  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    paddingLeft: SPACING.MD + 4,
    paddingRight: SPACING.MD,
    paddingVertical: SPACING.SM + 2,
    minHeight: TOUCH_TARGET.PREFERRED,
  },

  squareBtn: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#ffffff',
  },
  squareBtnDone: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  squareBtnSkipped: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  squareBtnCounter: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  counterText: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '700',
    color: COLORS.primary,
  },

  content: { flex: 1, gap: SPACING.XS },

  title: {
    fontSize: FONT_SIZE.TASK_TITLE,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  titleDimmed: {
    textDecorationLine: 'line-through',
    color: COLORS.textDisabled,
  },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  actorLabel: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
  },

  skipBtn: {
    minHeight: TOUCH_TARGET.MINIMUM,
    justifyContent: 'center',
    paddingHorizontal: SPACING.SM,
    flexShrink: 0,
  },
  skipLabel: {
    fontSize: FONT_SIZE.CAPTION,
    color: COLORS.textDisabled,
    fontWeight: '500',
  },

  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    paddingHorizontal: SPACING.MD + 4,
    paddingVertical: SPACING.XS + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  undoLabel: {
    fontSize: FONT_SIZE.CAPTION,
    fontWeight: '600',
    color: COLORS.secondary,
  },
});
