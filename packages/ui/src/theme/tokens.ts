/**
 * Design tokens — shared across all 4 mobile apps.
 *
 * Patient App uses TOUCH_TARGET.PREFERRED (64dp).
 * Other apps use TOUCH_TARGET.MINIMUM (48dp).
 *
 * Color system is Material Design 3 tone-based:
 *   primary (#0a2342 navy) + secondary (#2b685a teal) + neutral surfaces
 */

export const TOUCH_TARGET = {
  MINIMUM: 48,
  PREFERRED: 64,
} as const;

export const FONT_SIZE = {
  BODY: 17,
  BUTTON: 17,
  TASK_TITLE: 16,
  CAPTION: 13,
  H1: 28,
  H2: 22,
  H3: 18,
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

export const COLORS = {
  // ── Brand / Primary (dark navy) ──
  primary: '#0a2342',
  primaryMuted: '#768baf',
  primaryLight: '#b2c7ef',

  // ── Accent / Secondary (teal) ──
  secondary: '#2b685a',
  secondaryContainer: '#aeecd9',

  // ── Semantic ──
  success: '#2b685a',
  successLight: '#aeecd9',
  warning: '#c97000',
  warningLight: '#ffdea8',
  error: '#ba1a1a',
  errorLight: '#ffdad6',

  // ── SOS (always red, high contrast — non-negotiable) ──
  sos: '#ba1a1a',
  sosBackground: '#ffdad6',

  // ── Risk levels (AI Agent) ──
  riskGreen: '#2b685a',
  riskYellow: '#c97000',
  riskRed: '#ba1a1a',

  // ── Surfaces ──
  background: '#f9f9ff',
  surface: '#f0f3ff',
  surfaceElevated: '#e7eeff',
  surfaceSelected: '#dee8ff',

  // ── Outlines ──
  border: '#c4c6cf',
  borderStrong: '#74777e',

  // ── Text ──
  textPrimary: '#111c2c',
  textSecondary: '#44474e',
  textDisabled: '#74777e',

  // ── Status labels ──
  statusPending: '#c97000',
  statusActive: '#2b685a',
  statusInactive: '#74777e',
  statusVerification: '#F97316',
} as const;

export const BORDER_RADIUS = {
  SM: 6,
  MD: 10,
  LG: 12,
  XL: 16,
  FULL: 9999,
} as const;

export const SHADOW = {
  SM: {
    shadowColor: '#111c2c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  MD: {
    shadowColor: '#111c2c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  LG: {
    shadowColor: '#111c2c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;
