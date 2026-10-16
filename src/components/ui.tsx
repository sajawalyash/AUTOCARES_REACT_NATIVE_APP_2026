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

import { theme } from '../constants/autocares-theme';

export function Screen({ children, style, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 16) + 6;
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={styles.screenWrapper}>
      <View
        style={[
          styles.screen,
          {
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

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={[styles.input, props.style]}
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.outlineButton,
        color ? { borderColor: color } : null,
        disabled && styles.disabled,
        pressed && styles.pressedOutline,
      ]}>
      {children ? (
        children
      ) : (
        <Text style={[styles.outlineText, color ? { color } : null]}>{label}</Text>
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
  const badgeStyles = {
    blue: {
      bg: theme.colors.primaryLight,
      text: theme.colors.primaryDark,
      border: '#BAE6FD',
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
      text: '#15803D',
      border: '#BBF7D0',
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
  return (
    <View style={styles.center}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.mutedText}>{message}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    width: '100%',
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    letterSpacing: theme.typography.title.letterSpacing,
    lineHeight: theme.typography.title.lineHeight,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: theme.colors.primary, // Sky Blue #38B8E8
    borderRadius: theme.radius.md,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...theme.shadows.primaryButton,
  },
  yellowButton: {
    backgroundColor: theme.colors.yellow, // Yellow #FFD52A
    ...theme.shadows.yellowButton,
  },
  orangeButton: {
    backgroundColor: theme.colors.orange, // Orange #FF9800
    ...theme.shadows.orangeButton,
  },
  dangerButton: {
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF', // High-contrast crisp white on Sky Blue
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  yellowText: {
    color: theme.colors.text, // Slate-900 text for optimal readability on Yellow #FFD52A
    fontWeight: '800',
  },
  orangeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dangerText: {
    color: theme.colors.danger,
    fontWeight: '800',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: theme.colors.surface,
  },
  outlineText: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
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
  pressedOutline: {
    backgroundColor: theme.colors.primaryLight,
  },
  center: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    color: theme.colors.muted,
    textAlign: 'center',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
