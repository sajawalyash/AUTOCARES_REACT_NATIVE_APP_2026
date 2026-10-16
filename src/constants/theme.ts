import '@/global.css';

import { Platform } from 'react-native';
import { theme } from './autocares-theme';

export const Colors = {
  light: {
    text: theme.colors.text,
    background: theme.colors.background,
    backgroundElement: theme.colors.surfaceSubtle,
    backgroundSelected: theme.colors.primaryLight,
    textSecondary: theme.colors.muted,
    primary: theme.colors.primary,
    yellow: theme.colors.yellow,
    orange: theme.colors.orange,
    border: theme.colors.border,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    backgroundElement: '#1E293B',
    backgroundSelected: '#0369A1',
    textSecondary: '#94A3B8',
    primary: theme.colors.primary,
    yellow: theme.colors.yellow,
    orange: theme.colors.orange,
    border: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: theme.spacing.xs,
  one: theme.spacing.xs,
  two: theme.spacing.sm,
  three: theme.spacing.lg,
  four: theme.spacing.xxl,
  five: theme.spacing.xxxl,
  six: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = theme.layout.maxContentWidth;

export { theme };
