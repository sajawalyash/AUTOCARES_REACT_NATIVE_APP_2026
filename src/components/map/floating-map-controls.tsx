import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FloatingMapControlsProps = {
  hasCoords: boolean;
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitMarkers: () => void;
  hasMarkers: boolean;
  onToggleManualCoords?: () => void;
  manualMode?: boolean;
};

export function FloatingMapControls({
  hasCoords,
  onRecenter,
  onZoomIn,
  onZoomOut,
  onFitMarkers,
  hasMarkers,
  onToggleManualCoords,
  manualMode = false,
}: FloatingMapControlsProps) {
  return (
    <View style={styles.controlsCol}>
      {/* Recenter GPS */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter on current GPS location"
        onPress={onRecenter}
        style={[
          styles.btn,
          hasCoords && styles.btnActive,
        ]}>
        <Ionicons
          name={hasCoords ? 'locate' : 'locate-outline'}
          size={20}
          color={hasCoords ? '#38B8E8' : '#64748B'}
        />
      </Pressable>

      {/* Zoom In */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
        onPress={onZoomIn}
        style={styles.btn}>
        <Ionicons name="add" size={20} color="#0F172A" />
      </Pressable>

      {/* Zoom Out */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        onPress={onZoomOut}
        style={styles.btn}>
        <Ionicons name="remove" size={20} color="#0F172A" />
      </Pressable>

      {/* Fit all markers */}
      {hasMarkers && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fit all markers in view"
          onPress={onFitMarkers}
          style={styles.btn}>
          <Ionicons name="scan-outline" size={18} color="#1797C7" />
        </Pressable>
      )}

      {/* Optional custom coordinates modal/manual entry toggle */}
      {onToggleManualCoords && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle manual coordinate search"
          onPress={onToggleManualCoords}
          style={[styles.btn, manualMode && styles.btnActive]}>
          <Ionicons
            name="compass-outline"
            size={18}
            color={manualMode ? '#38B8E8' : '#64748B'}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlsCol: {
    gap: 8,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  btnActive: {
    backgroundColor: '#EBF8FD',
    borderColor: '#38B8E8',
  },
});
