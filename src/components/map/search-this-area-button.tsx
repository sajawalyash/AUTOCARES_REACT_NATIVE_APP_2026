import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SearchThisAreaButtonProps = {
  visible: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function SearchThisAreaButton({
  visible,
  loading = false,
  onPress,
}: SearchThisAreaButtonProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search this area for mechanics"
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}>
        <Ionicons
          name={loading ? 'hourglass-outline' : 'search'}
          size={16}
          color="#1797C7"
        />
        <Text style={styles.buttonText}>
          {loading ? 'Searching area…' : 'Search This Area'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#38B8E8',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
