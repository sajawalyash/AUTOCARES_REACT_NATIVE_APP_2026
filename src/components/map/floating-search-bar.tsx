import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FloatingSearchBarProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  locationLabel?: string | null;
  onRecenterCustomer: () => void;
  hasGpsLocation: boolean;
};

export function FloatingSearchBar({
  searchQuery,
  onSearchChange,
  locationLabel,
  onRecenterCustomer,
  hasGpsLocation,
}: FloatingSearchBarProps) {
  return (
    <View style={styles.card}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={20} color="#38B8E8" style={styles.searchIcon} />

        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Find mechanics nearby…"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />

        {searchQuery.length > 0 && (
          <Pressable
            accessibilityLabel="Clear search"
            onPress={() => onSearchChange('')}
            hitSlop={8}
            style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        )}

        {/* GPS Shortcut */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Locate current position"
          onPress={onRecenterCustomer}
          hitSlop={6}
          style={[
            styles.gpsBtn,
            hasGpsLocation && styles.gpsBtnActive,
          ]}>
          <Ionicons
            name={hasGpsLocation ? 'locate' : 'locate-outline'}
            size={18}
            color={hasGpsLocation ? '#38B8E8' : '#94A3B8'}
          />
        </Pressable>
      </View>

      {locationLabel ? (
        <View style={styles.locationSubtitleRow}>
          <Ionicons name="location" size={12} color="#1797C7" />
          <Text style={styles.locationSubtitleText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    marginRight: 6,
  },
  gpsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsBtnActive: {
    backgroundColor: '#EBF8FD',
    borderColor: '#38B8E8',
  },
  locationSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    paddingLeft: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 4,
  },
  locationSubtitleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
});
