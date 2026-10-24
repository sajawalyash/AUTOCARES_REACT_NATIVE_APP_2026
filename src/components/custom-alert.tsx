import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import { theme } from '../constants/autocares-theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

type AlertListener = (options: CustomAlertOptions | null) => void;
let globalAlertListener: AlertListener | null = null;

export function registerAlertListener(listener: AlertListener) {
  globalAlertListener = listener;
  return () => {
    globalAlertListener = null;
  };
}

/**
 * Modern themed popup alert replacing the raw system Alert.alert()
 */
export function customAlert(options: CustomAlertOptions) {
  if (globalAlertListener) {
    globalAlertListener(options);
  }
}

customAlert.success = (title: string, message?: string, onConfirm?: () => void) => {
  customAlert({
    title,
    message,
    type: 'success',
    confirmText: 'Great, thanks!',
    onConfirm,
  });
};

customAlert.error = (title: string, message?: string, onConfirm?: () => void) => {
  customAlert({
    title,
    message,
    type: 'error',
    confirmText: 'Dismiss',
    onConfirm,
  });
};

customAlert.warning = (title: string, message?: string, onConfirm?: () => void) => {
  customAlert({
    title,
    message,
    type: 'warning',
    confirmText: 'Understood',
    onConfirm,
  });
};

customAlert.info = (title: string, message?: string, onConfirm?: () => void) => {
  customAlert({
    title,
    message,
    type: 'info',
    confirmText: 'OK',
    onConfirm,
  });
};

export function CustomAlertModal() {
  const [alert, setAlert] = useState<CustomAlertOptions | null>(null);
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const close = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlert(null);
      if (callback) {
        callback();
      }
    });
  }, [opacity, scale]);

  useEffect(() => {
    return registerAlertListener((newAlert) => {
      if (newAlert) {
        setAlert(newAlert);
        if (Platform.OS !== 'web') {
          try {
            Vibration.vibrate(80);
          } catch {
            // ignore
          }
        }
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        close();
      }
    });
  }, [close, opacity, scale]);

  if (!alert) return null;

  const type = alert.type ?? 'info';

  const typeConfig = {
    success: {
      icon: 'checkmark-circle' as const,
      color: theme.colors.primary, // AutoCares Sky Blue
      bg: theme.colors.primaryLight,
      border: theme.colors.primarySubtle,
      titleColor: theme.colors.text,
      badgeText: 'SUCCESS',
      badgeColor: theme.colors.primaryDark,
      badgeBg: theme.colors.primaryLight,
    },
    error: {
      icon: 'close-circle' as const,
      color: theme.colors.danger,
      bg: theme.colors.dangerLight,
      border: '#FECACA',
      titleColor: theme.colors.text,
      badgeText: 'ERROR',
      badgeColor: '#B91C1C',
      badgeBg: '#FEE2E2',
    },
    warning: {
      icon: 'warning' as const,
      color: theme.colors.orange,
      bg: theme.colors.orangeLight,
      border: theme.colors.orangeSubtle,
      titleColor: theme.colors.text,
      badgeText: 'NOTICE',
      badgeColor: theme.colors.orangeText,
      badgeBg: theme.colors.orangeLight,
    },
    info: {
      icon: 'information-circle' as const,
      color: theme.colors.primary,
      bg: theme.colors.primaryLight,
      border: theme.colors.primarySubtle,
      titleColor: theme.colors.text,
      badgeText: 'AUTOCARES',
      badgeColor: theme.colors.primaryDark,
      badgeBg: theme.colors.primaryLight,
    },
  }[type];

  // Resolve buttons
  let buttons: AlertButton[] = [];
  if (alert.buttons && alert.buttons.length > 0) {
    buttons = alert.buttons;
  } else if (alert.cancelText || alert.onCancel) {
    buttons = [
      {
        text: alert.cancelText ?? 'Cancel',
        style: 'cancel',
        onPress: alert.onCancel,
      },
      {
        text: alert.confirmText ?? 'Confirm',
        style: 'default',
        onPress: alert.onConfirm,
      },
    ];
  } else {
    buttons = [
      {
        text: alert.confirmText ?? 'OK',
        style: 'default',
        onPress: alert.onConfirm,
      },
    ];
  }

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close(alert.onCancel)}>
      <View style={styles.overlay}>
        {/* Animated Dim Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={styles.backdropPressable} onPress={() => close(alert.onCancel)} />
        </Animated.View>

        {/* Modal Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}>
          <View style={styles.card}>
            {/* Top Accent Strip */}
            <View style={[styles.topAccentBar, { backgroundColor: typeConfig.color }]} />

            {/* Glowing Hero Icon Box */}
            <View style={[styles.iconBoxOuter, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
              <View style={[styles.iconBoxInner, { backgroundColor: typeConfig.color }]}>
                <Ionicons name={typeConfig.icon} size={30} color="#FFFFFF" />
              </View>
            </View>

            {/* Category Pill Tag */}
            <View style={[styles.badgePill, { backgroundColor: typeConfig.badgeBg }]}>
              <Text style={[styles.badgeText, { color: typeConfig.badgeColor }]}>
                {typeConfig.badgeText}
              </Text>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>{alert.title}</Text>
            {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            {/* Action Buttons */}
            <View style={[styles.buttonRow, buttons.length > 1 && styles.buttonRowMulti]}>
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.btn,
                      buttons.length > 1 ? styles.btnHalf : styles.btnFull,
                      isCancel
                        ? styles.btnCancel
                        : isDestructive
                        ? styles.btnDestructive
                        : styles.btnPrimary,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => close(btn.onPress)}>
                    <Text
                      style={[
                        styles.btnText,
                        isCancel
                          ? styles.btnTextCancel
                          : isDestructive
                          ? styles.btnTextDestructive
                          : styles.btnTextPrimary,
                      ]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', // Deep slate overlay
  },
  backdropPressable: {
    flex: 1,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconBoxOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  iconBoxInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 4,
  },
  buttonRowMulti: {
    gap: 10,
  },
  btn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnFull: {
    flex: 1,
  },
  btnHalf: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary, // AutoCares Sky Blue
    ...theme.shadows.card,
  },
  btnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnDestructive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
  },
  btnTextCancel: {
    color: '#475569',
  },
  btnTextDestructive: {
    color: '#DC2626',
  },
});
