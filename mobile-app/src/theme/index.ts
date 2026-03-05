/**
 * Shared design tokens for the Sahulat mobile app.
 * Mobile-first: all touch targets are min 44×44 pt (Apple HIG + Material).
 */

export const Colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef9c3',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  bg: '#f9fafb',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  white: '#ffffff',
};

export const TAP_MIN = 44; // minimum touch target (pt)

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export const Typography = {
  display: { fontSize: 26, fontWeight: '800' as const },
  heading: { fontSize: 20, fontWeight: '700' as const },
  subheading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '400' as const },
};

/** Common card shadow (iOS + Android) */
export const CardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
};
