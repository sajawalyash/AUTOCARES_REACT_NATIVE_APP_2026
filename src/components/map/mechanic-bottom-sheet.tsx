import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../avatar';
import { MechanicPreviewCard } from './mechanic-preview-card';
import { formatDistance, type SearchRadiusMeters } from '../../lib/geo';
import type { NearbyMechanic } from '../../lib/mechanics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Collapsed shows header + top preview card (~210)
const COLLAPSED_HEIGHT = 220;
// Expanded covers up to 60% of screen height
const EXPANDED_HEIGHT = Math.min(520, SCREEN_HEIGHT * 0.62);

export type MechanicBottomSheetProps = {
  mechanics: NearbyMechanic[];
  selectedMechanic: NearbyMechanic | null;
  onSelectMechanic: (mechanic: NearbyMechanic) => void;
  onClearSelection: () => void;
  onRequestAssistance: (mechanic: NearbyMechanic) => void;
  onExpandRadius: () => void;
  selectedRadius: SearchRadiusMeters;
};

export function MechanicBottomSheet({
  mechanics,
  selectedMechanic,
  onSelectMechanic,
  onClearSelection,
  onRequestAssistance,
  onExpandRadius,
  selectedRadius,
}: MechanicBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useMemo(() => new Animated.Value(COLLAPSED_HEIGHT), []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      const toValue = next ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
      Animated.spring(animatedHeight, {
        toValue,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
      return next;
    });
  }, [animatedHeight]);

  const collapse = useCallback(() => {
    Animated.spring(animatedHeight, {
      toValue: COLLAPSED_HEIGHT,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
    setIsExpanded(false);
  }, [animatedHeight]);

  const expand = useCallback(() => {
    Animated.spring(animatedHeight, {
      toValue: EXPANDED_HEIGHT,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
    setIsExpanded(true);
  }, [animatedHeight]);

  // PanResponder for drag handle
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dy < -30) {
            expand();
          } else if (gestureState.dy > 30) {
            collapse();
          } else {
            toggleExpand();
          }
        },
      }),
    [collapse, expand, toggleExpand]
  );

  // Closest mechanic for collapsed preview if none is explicitly selected
  const activePreviewMechanic = selectedMechanic || mechanics[0] || null;

  return (
    <Animated.View style={[styles.sheetContainer, { height: animatedHeight }]}>
      {/* Drag Indicator and Header Handle */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.dragPill} />
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <View style={styles.titleWithCount}>
              <Text style={styles.headerTitle}>Nearby Mechanics</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{mechanics.length}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Within {selectedRadius / 1000} km search radius
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Collapse list' : 'Expand full list'}
            onPress={toggleExpand}
            style={styles.expandToggleBtn}>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#0F172A"
            />
          </Pressable>
        </View>
      </View>

      {/* Body Content */}
      {mechanics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="location-outline" size={26} color="#64748B" />
          </View>
          <Text style={styles.emptyTitle}>No mechanics found in this area</Text>
          <Text style={styles.emptySubtitle}>
            Try expanding your search radius or searching another location on the map.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onExpandRadius}
            style={styles.expandRadiusBtn}>
            <Ionicons name="resize-outline" size={16} color="#FFFFFF" />
            <Text style={styles.expandRadiusBtnText}>Expand Search Radius</Text>
          </Pressable>
        </View>
      ) : isExpanded ? (
        // Expanded List View
        <FlatList
          data={mechanics}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.user_id === selectedMechanic?.user_id;
            const isAvailable = item.is_available !== false;
            const name =
              item.workshop_name || item.profiles?.full_name || 'Mechanic';
            const distanceStr = formatDistance(item.distance_km);

            return (
              <Pressable
                onPress={() => onSelectMechanic(item)}
                style={[styles.itemCard, isSelected && styles.itemCardSelected]}>
                <View style={styles.itemTopRow}>
                  <Avatar
                    url={item.profiles?.avatar_url}
                    name={name}
                    size={44}
                  />
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {name}
                      </Text>
                      <View style={styles.itemRatingBadge}>
                        <Ionicons name="star" size={10} color="#B45309" />
                        <Text style={styles.itemRatingText}>
                          {Number(item.average_rating || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {item.mechanic_type ?? 'Mechanic'} · {distanceStr} away
                      {item.eta_minutes > 0 ? ` · ~${item.eta_minutes}m` : ''}
                    </Text>
                  </View>
                </View>

                {/* Status and Action Buttons */}
                <View style={styles.itemActionsRow}>
                  <View style={styles.itemStatusBadge}>
                    <View
                      style={[
                        styles.itemStatusDot,
                        { backgroundColor: isAvailable ? '#16A34A' : '#94A3B8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.itemStatusText,
                        { color: isAvailable ? '#16A34A' : '#64748B' },
                      ]}>
                      {isAvailable ? 'Available' : 'Busy'}
                    </Text>
                  </View>

                  <View style={styles.btnGroup}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSelectMechanic(item)}
                      style={[
                        styles.viewOnMapBtn,
                        isSelected && styles.viewOnMapBtnSelected,
                      ]}>
                      <Ionicons
                        name="map-outline"
                        size={13}
                        color={isSelected ? '#1797C7' : '#475569'}
                      />
                      <Text
                        style={[
                          styles.viewOnMapText,
                          isSelected && styles.viewOnMapTextSelected,
                        ]}>
                        Map
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={!isAvailable}
                      onPress={() => onRequestAssistance(item)}
                      style={[
                        styles.itemRequestBtn,
                        !isAvailable && styles.itemRequestBtnDisabled,
                      ]}>
                      <Text style={styles.itemRequestBtnText}>
                        {isAvailable ? 'Request' : 'Busy'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        // Collapsed Preview View
        <View style={styles.collapsedPreviewContainer}>
          {activePreviewMechanic && (
            <MechanicPreviewCard
              mechanic={activePreviewMechanic}
              onRequestAssistance={onRequestAssistance}
              onClose={selectedMechanic ? onClearSelection : undefined}
              onPressCard={expand}
            />
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    zIndex: 100,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  dragPill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleCol: {
    flex: 1,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#EBF8FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#38B8E8',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1797C7',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  expandToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedPreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  itemCardSelected: {
    borderColor: '#38B8E8',
    borderWidth: 1.5,
    backgroundColor: '#F0F9FF',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  itemRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  itemRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#713F12',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewOnMapBtnSelected: {
    borderColor: '#38B8E8',
    backgroundColor: '#EBF8FD',
  },
  viewOnMapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  viewOnMapTextSelected: {
    color: '#1797C7',
  },
  itemRequestBtn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRequestBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  itemRequestBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    maxWidth: 260,
  },
  expandRadiusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38B8E8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  expandRadiusBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
