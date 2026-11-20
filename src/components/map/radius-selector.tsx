import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SEARCH_RADII_METERS,
  type SearchRadiusMeters,
  radiusMetersToLabel,
} from '../../lib/geo';

export type RadiusSelectorProps = {
  selectedRadius: SearchRadiusMeters;
  onSelectRadius: (radius: SearchRadiusMeters) => void;
};

export function RadiusSelector({
  selectedRadius,
  onSelectRadius,
}: RadiusSelectorProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Search Radius</Text>
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>
            {radiusMetersToLabel(selectedRadius)}
          </Text>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {SEARCH_RADII_METERS.map((radius) => {
          const isSelected = selectedRadius === radius;
          return (
            <Pressable
              key={radius}
              accessibilityRole="button"
              accessibilityLabel={`Select search radius ${radiusMetersToLabel(radius)}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectRadius(radius)}
              style={[
                styles.optionBtn,
                isSelected && styles.optionBtnSelected,
              ]}>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}>
                {radiusMetersToLabel(radius)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentBadge: {
    backgroundColor: '#EBF8FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#38B8E8',
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1797C7',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionBtnSelected: {
    backgroundColor: '#38B8E8',
    borderColor: '#38B8E8',
    elevation: 2,
    shadowColor: '#38B8E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
