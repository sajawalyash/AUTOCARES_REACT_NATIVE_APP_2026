import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../avatar';
import { formatDistance } from '../../lib/geo';
import type { NearbyMechanic } from '../../lib/mechanics';

export type MechanicPreviewCardProps = {
  mechanic: NearbyMechanic;
  onRequestAssistance: (mechanic: NearbyMechanic) => void;
  onClose?: () => void;
  onPressCard?: (mechanic: NearbyMechanic) => void;
};

export const MechanicPreviewCard = React.memo(function MechanicPreviewCard({
  mechanic,
  onRequestAssistance,
  onClose,
  onPressCard,
}: MechanicPreviewCardProps) {
  const isAvailable = mechanic.is_available !== false;
  const isBike = mechanic.mechanic_type === 'Bike Mechanic';
  const name =
    mechanic.workshop_name || mechanic.profiles?.full_name || 'AutoCares Mechanic';
  const rating = Number(mechanic.average_rating || 0).toFixed(1);
  const distanceStr = formatDistance(mechanic.distance_km);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPressCard?.(mechanic)}>
      <View style={styles.topRow}>
        <Avatar
          url={mechanic.profiles?.avatar_url}
          name={name}
          size={50}
        />

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {onClose && (
              <Pressable
                accessibilityLabel="Close mechanic preview"
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Ionicons
                name={isBike ? 'bicycle' : 'car'}
                size={12}
                color="#1797C7"
              />
              <Text style={styles.typeBadgeText}>
                {mechanic.mechanic_type ?? 'Mechanic'}
              </Text>
            </View>

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color="#B45309" />
              <Text style={styles.ratingText}>{rating}</Text>
              {mechanic.rating_count ? (
                <Text style={styles.ratingCount}>({mechanic.rating_count})</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Specialties line */}
      <Text style={styles.specialties} numberOfLines={1}>
        Specialties: {mechanic.specialties?.length ? mechanic.specialties.join(', ') : 'General roadside repairs'}
      </Text>

      {/* Distance and Availability Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-outline" size={13} color="#1797C7" />
          <Text style={styles.distanceText}>
            {distanceStr} away {mechanic.eta_minutes > 0 ? `· ~${mechanic.eta_minutes} min` : ''}
          </Text>
        </View>

        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isAvailable ? '#16A34A' : '#94A3B8' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isAvailable ? '#16A34A' : '#64748B' },
            ]}>
            {isAvailable ? 'Available Now' : 'Currently Busy'}
          </Text>
        </View>
      </View>

      {/* Request Assistance CTA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Request assistance from ${name}`}
        disabled={!isAvailable}
        onPress={() => onRequestAssistance(mechanic)}
        style={({ pressed }) => [
          styles.requestBtn,
          !isAvailable && styles.requestBtnDisabled,
          pressed && isAvailable && styles.requestBtnPressed,
        ]}>
        <Ionicons
          name={isAvailable ? 'flash' : 'time-outline'}
          size={16}
          color="#FFFFFF"
        />
        <Text style={styles.requestBtnText}>
          {isAvailable ? 'Request Assistance' : 'Mechanic Currently Busy'}
        </Text>
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  closeBtn: {
    padding: 2,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF8FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1797C7',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#713F12',
  },
  ratingCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#854D0E',
  },
  specialties: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  requestBtnPressed: {
    backgroundColor: '#E68900',
    transform: [{ scale: 0.99 }],
  },
  requestBtnDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
