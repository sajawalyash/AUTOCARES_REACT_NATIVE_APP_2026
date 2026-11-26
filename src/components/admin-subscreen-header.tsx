import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/autocares-theme';
import { useAppTheme } from '../providers/theme-provider';

interface AdminSubscreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
}

export default function AdminSubscreenHeader({
  title,
  subtitle,
  rightAction,
  backLabel = 'Tools',
  onBack,
}: AdminSubscreenHeaderProps) {
  const { theme: appTheme } = useAppTheme();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)/(tabs)/tools');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: appTheme.colors.surface,
              borderColor: appTheme.colors.border,
            },
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}>
          <Ionicons name="arrow-back" size={20} color={appTheme.colors.primary} />
          <Text style={[styles.backText, { color: appTheme.colors.text }]}>{backLabel}</Text>
        </Pressable>

        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>

      <Text style={[styles.title, { color: appTheme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: appTheme.colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    gap: 4,
    ...theme.shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
});
