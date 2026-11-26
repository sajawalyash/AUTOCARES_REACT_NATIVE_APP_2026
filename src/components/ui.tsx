import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme as defaultTheme } from '../constants/autocares-theme';
import { useAppTheme } from '../providers/theme-provider';

export interface ScreenProps extends ViewProps {
  safeBottom?: boolean;
}

export function Screen({ children, style, safeBottom = true, ...rest }: ScreenProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 16) + 6;
  const bottomPadding = safeBottom ? Math.max(insets.bottom, 16) : 0;

  return (
    <View style={[styles.screenWrapper, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.screen,
          {
            backgroundColor: theme.colors.background,
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
          },
          style,
        ]}
        {...rest}>
        {children}
      </View>
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.title, { color: theme.colors.text }, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.subtitle, { color: theme.colors.muted }, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useAppTheme();
  return (
    <Text
      style={[
        {
          fontSize: theme.typography.heading.fontSize,
          fontWeight: theme.typography.heading.fontWeight,
          lineHeight: theme.typography.heading.lineHeight,
          color: theme.colors.text,
          marginBottom: 6,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...theme.shadows.card,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export function Label({ children, style }: { children: string; style?: any }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.label, { color: theme.colors.text }, style]}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  const { theme } = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text,
        },
        props.style,
      ]}
      {...props}
    />
  );
}

export type ButtonVariant = 'primary' | 'yellow' | 'accent' | 'orange' | 'cta' | 'danger';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  danger,
  variant = 'primary',
  children,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  variant?: ButtonVariant;
  children?: ReactNode;
}) {
  const isDanger = danger || variant === 'danger';
  const isYellow = variant === 'yellow' || variant === 'accent';
  const isOrange = variant === 'orange' || variant === 'cta';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isDanger && styles.dangerButton,
        isYellow && styles.yellowButton,
        isOrange && styles.orangeButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {children ? (
        children
      ) : (
        <Text
          style={[
            styles.buttonText,
            isDanger && styles.dangerText,
            isYellow && styles.yellowText,
            isOrange && styles.orangeText,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled,
  children,
  color,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  children?: ReactNode;
  color?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.outlineButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: color ?? theme.colors.primary,
        },
        disabled && styles.disabled,
        pressed && { backgroundColor: theme.colors.primaryLight },
      ]}>
      {children ? (
        children
      ) : (
        <Text style={[styles.outlineText, { color: color ?? theme.colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Badge({
  label,
  variant = 'blue',
}: {
  label: string;
  variant?: 'blue' | 'yellow' | 'orange' | 'green' | 'muted';
}) {
  const { theme } = useAppTheme();
  const badgeStyles = {
    blue: {
      bg: theme.colors.primaryLight,
      text: theme.colors.primary,
      border: theme.colors.primarySubtle,
    },
    yellow: {
      bg: theme.colors.yellowLight,
      text: theme.colors.yellowText,
      border: theme.colors.yellow,
    },
    orange: {
      bg: theme.colors.orangeLight,
      text: theme.colors.orangeText,
      border: theme.colors.orange,
    },
    green: {
      bg: theme.colors.successLight,
      text: theme.colors.success,
      border: theme.colors.success,
    },
    muted: {
      bg: theme.colors.surfaceSubtle,
      text: theme.colors.muted,
      border: theme.colors.border,
    },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: badgeStyles.bg, borderColor: badgeStyles.border }]}>
      <Text style={[styles.badgeText, { color: badgeStyles.text }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let variant: 'blue' | 'yellow' | 'orange' | 'green' | 'muted' = 'muted';
  let label = status.replace('_', ' ');

  switch (status) {
    case 'pending':
      variant = 'yellow';
      label = 'Pending';
      break;
    case 'accepted':
      variant = 'blue';
      label = 'Accepted';
      break;
    case 'en_route':
      variant = 'orange';
      label = 'En Route';
      break;
    case 'in_progress':
      variant = 'orange';
      label = 'In Progress';
      break;
    case 'completed':
      variant = 'green';
      label = 'Completed';
      break;
    case 'paid':
      variant = 'green';
      label = 'Paid';
      break;
    case 'cancelled':
      variant = 'muted';
      label = 'Cancelled';
      break;
    default:
      variant = 'blue';
  }

  return <Badge label={label} variant={variant} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{message}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  const { isDark } = useAppTheme();
  if (!message) return null;
  return (
    <View
      style={[
        styles.errorBox,
        {
          backgroundColor: isDark ? '#2B1214' : '#FEF2F2',
          borderColor: isDark ? '#591B1F' : '#FECACA',
        },
      ]}
      accessibilityRole="alert">
      <View
        style={[
          styles.errorIconCircle,
          { backgroundColor: isDark ? '#4A1519' : '#FEE2E2' },
        ]}>
        <Ionicons name="alert-circle" size={18} color="#EF4444" />
      </View>
      <View style={styles.errorContent}>
        <Text style={[styles.errorTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>Notice</Text>
        <Text style={[styles.errorText, { color: isDark ? '#F87171' : '#B91C1C' }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    width: '100%',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    maxWidth: defaultTheme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: defaultTheme.typography.title.fontSize,
    fontWeight: defaultTheme.typography.title.fontWeight,
    letterSpacing: defaultTheme.typography.title.letterSpacing,
    lineHeight: defaultTheme.typography.title.lineHeight,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: defaultTheme.typography.subtitle.fontSize,
    lineHeight: defaultTheme.typography.subtitle.lineHeight,
    marginBottom: 16,
  },
  card: {
    borderRadius: defaultTheme.radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: defaultTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: defaultTheme.colors.primary,
    borderRadius: defaultTheme.radius.md,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...defaultTheme.shadows.primaryButton,
  },
  yellowButton: {
    backgroundColor: defaultTheme.colors.yellow,
    ...defaultTheme.shadows.yellowButton,
  },
  orangeButton: {
    backgroundColor: defaultTheme.colors.orange,
    ...defaultTheme.shadows.orangeButton,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  yellowText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  orangeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dangerText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderRadius: defaultTheme.radius.md,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  outlineText: {
    fontWeight: '700',
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: defaultTheme.radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  center: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    textAlign: 'center',
    fontSize: 14,
  },
  errorBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
