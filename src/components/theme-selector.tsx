import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme, type ThemeMode } from '../providers/theme-provider';

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const OPTIONS: ThemeOption[] = [
  {
    mode: 'system',
    label: 'System',
    icon: 'phone-portrait-outline',
    description: 'Match device',
  },
  {
    mode: 'light',
    label: 'Light',
    icon: 'sunny-outline',
    description: 'Always light',
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: 'moon-outline',
    description: 'Always dark',
  },
];

export function ThemeSelector() {
  const { mode, setMode, theme, isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={18}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Appearance</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {mode === 'system'
              ? `System default (${isDark ? 'Dark' : 'Light'})`
              : mode === 'dark'
              ? 'Dark theme active'
              : 'Light theme active'}
          </Text>
        </View>
      </View>

      <View style={[styles.segmentContainer, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
        {OPTIONS.map((option) => {
          const isSelected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label} theme`}
              onPress={() => void setMode(option.mode)}
              style={({ pressed }) => [
                styles.segmentItem,
                isSelected && [
                  styles.segmentItemSelected,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  },
                ],
                pressed && { opacity: 0.8 },
              ]}>
              <Ionicons
                name={option.icon}
                size={16}
                color={isSelected ? theme.colors.primary : theme.colors.muted}
                style={styles.segmentIcon}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: isSelected ? theme.colors.primary : theme.colors.text },
                  isSelected && styles.segmentLabelSelected,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  segmentItemSelected: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  segmentIcon: {
    marginRight: 1,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentLabelSelected: {
    fontWeight: '800',
  },
});
