import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MapLegendProps = {
  hasSelected?: boolean;
};

export function MapLegend({ hasSelected = false }: MapLegendProps) {
  return (
    <View style={styles.card}>
      {/* Customer GPS Location */}
      <View style={styles.item}>
        <View style={styles.customerDotOuter}>
          <View style={styles.customerDotInner} />
        </View>
        <Text style={styles.label}>You</Text>
      </View>

      {/* Available Mechanic */}
      <View style={styles.item}>
        <View style={[styles.pinDot, { backgroundColor: '#38B8E8' }]}>
          <Ionicons name="construct" size={8} color="#FFFFFF" />
        </View>
        <Text style={styles.label}>Available</Text>
      </View>

      {/* Busy Mechanic */}
      <View style={styles.item}>
        <View style={[styles.pinDot, { backgroundColor: '#94A3B8' }]}>
          <Ionicons name="construct" size={8} color="#FFFFFF" />
        </View>
        <Text style={styles.label}>Busy</Text>
      </View>

      {/* Selected Mechanic */}
      {hasSelected && (
        <View style={styles.item}>
          <View
            style={[
              styles.pinDot,
              {
                backgroundColor: '#38B8E8',
                borderColor: '#FFD52A',
                borderWidth: 1.5,
              },
            ]}>
            <Ionicons name="construct" size={8} color="#FFFFFF" />
          </View>
          <Text style={[styles.label, { color: '#0F172A', fontWeight: '800' }]}>
            Selected
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerDotOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#38B8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38B8E8',
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});
