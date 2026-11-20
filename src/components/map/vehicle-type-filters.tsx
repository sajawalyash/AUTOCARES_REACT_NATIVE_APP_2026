import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VehicleType } from '../../lib/types';

export const VEHICLE_FILTERS: (VehicleType | 'All')[] = [
  'All',
  'Car',
  'Bike',
  'Scooter',
  'Van',
];

export type VehicleTypeFiltersProps = {
  selectedFilter: VehicleType | 'All';
  onSelectFilter: (filter: VehicleType | 'All') => void;
};

function getFilterIcon(filter: VehicleType | 'All') {
  switch (filter) {
    case 'Car':
      return 'car-outline';
    case 'Bike':
      return 'bicycle-outline';
    case 'Scooter':
      return 'speedometer-outline';
    case 'Van':
      return 'bus-outline';
    case 'All':
    default:
      return 'grid-outline';
  }
}

export function VehicleTypeFilters({
  selectedFilter,
  onSelectFilter,
}: VehicleTypeFiltersProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {VEHICLE_FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter;
          const iconName = getFilterIcon(filter);

          return (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${filter}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectFilter(filter)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}>
              <Ionicons
                name={iconName as any}
                size={14}
                color={isSelected ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}>
                {filter === 'All' ? 'All Vehicles' : filter}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  chipSelected: {
    backgroundColor: '#38B8E8',
    borderColor: '#38B8E8',
    elevation: 3,
    shadowColor: '#38B8E8',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
