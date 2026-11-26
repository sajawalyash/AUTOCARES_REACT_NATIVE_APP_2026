import '@/global.css';

import { Platform } from 'react-native';
import { darkColors, lightColors, theme } from './autocares-theme';

export const Colors = {
  light: {
    text: lightColors.text,
    background: lightColors.background,
    backgroundElement: lightColors.surfaceSubtle,
    backgroundSelected: lightColors.primaryLight,
    textSecondary: lightColors.muted,
    primary: lightColors.primary,
    yellow: lightColors.yellow,
    orange: lightColors.orange,
    border: lightColors.border,
  },
  dark: {
    text: darkColors.text,
    background: darkColors.background,
    backgroundElement: darkColors.surfaceSubtle,
    backgroundSelected: darkColors.primaryLight,
    textSecondary: darkColors.muted,
    primary: darkColors.primary,
    yellow: darkColors.yellow,
    orange: darkColors.orange,
    border: darkColors.border,
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
