import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import { theme } from '../constants/autocares-theme';

export type AlertType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'confirmation'
  | 'loading'
  | 'whatsapp';

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive' | 'primary' | 'whatsapp';
  icon?: string;
}

export interface CustomAlertOptions {
  title: string;
  message?: string;
  subtitle?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
  dismissible?: boolean;
  customIcon?: React.ReactNode;
  badgeText?: string;
  // WhatsApp specific options
  whatsappPhone?: string;
  whatsappMessage?: string;
  displayNumber?: string;
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
 * Intelligent helper to deduce the best visual alert type from title, message, and button intent
 */
function inferAlertType(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  explicitType?: AlertType
): AlertType {
  if (explicitType) return explicitType;

  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();
  const combined = `${t} ${m}`;

  // WhatsApp
  if (combined.includes('whatsapp')) return 'whatsapp';

  // Multi-button confirmation checks
  if (buttons && buttons.length > 1) {
    return 'confirmation';
  }

  // Success indicators
  if (
    combined.includes('success') ||
    combined.includes('saved') ||
    combined.includes('updated') ||
    combined.includes('completed') ||
    combined.includes('restored') ||
    combined.includes('submitted') ||
    combined.includes('thank you') ||
    combined.includes('created')
  ) {
    return 'success';
  }

  // Error indicators
  if (
    combined.includes('fail') ||
    combined.includes('error') ||
    combined.includes('wrong') ||
    combined.includes('invalid') ||
    combined.includes('could not') ||
    combined.includes('unable') ||
    combined.includes('missing') ||
    combined.includes('required') ||
    combined.includes('denied')
  ) {
    return 'error';
  }

  // Warning indicators
  if (
    combined.includes('sure') ||
    combined.includes('warn') ||
    combined.includes('caution') ||
    combined.includes('unavailable') ||
    combined.includes('already') ||
    combined.includes('notice') ||
    combined.includes('not verified')
  ) {
    return 'warning';
  }

  return 'info';
}

/**
 * Universal popup alert system replacing Alert.alert()
 * Supports both function signatures:
 * 1) customAlert(options: CustomAlertOptions)
 * 2) customAlert(title: string, message?: string, buttons?: AlertButton[], extraOptions?: Partial<CustomAlertOptions>)
 */
export function customAlert(
  titleOrOptions: string | CustomAlertOptions,
  message?: string,
  buttons?: AlertButton[],
  extraOptions?: Partial<CustomAlertOptions>
) {
  if (typeof titleOrOptions === 'object') {
    const opts = titleOrOptions;
    const inferredType = inferAlertType(
      opts.title,
      opts.message,
      opts.buttons,
      opts.type
    );
    if (globalAlertListener) {
      globalAlertListener({
        ...opts,
        type: inferredType,
      });
    }
    return;
  }

  const title = titleOrOptions;
  const inferredType = inferAlertType(
    title,
    message,
    buttons,
    extraOptions?.type
  );

  const finalOptions: CustomAlertOptions = {
    title,
    message,
    buttons,
    type: inferredType,
    ...extraOptions,
  };

  if (globalAlertListener) {
    globalAlertListener(finalOptions);
  }
}

/**
 * Exact drop-in alias for React Native's Alert.alert(title, message, buttons, options)
 */
customAlert.alert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean; type?: AlertType }
) => {
  customAlert(title, message, buttons, {
    dismissible: options?.cancelable ?? true,
    type: options?.type,
  });
};

/**
 * Success Popup
 */
customAlert.success = (
  title: string,
  message?: string,
  onConfirm?: () => void,
  confirmText: string = 'Great, Got It'
) => {
  customAlert({
    title,
    message,
    type: 'success',
    confirmText,
    onConfirm,
  });
};

/**
 * Error Popup
 */
customAlert.error = (
  title: string,
  message?: string,
  onConfirm?: () => void,
  confirmText: string = 'Dismiss'
) => {
  customAlert({
    title,
    message,
    type: 'error',
    confirmText,
    onConfirm,
  });
};

/**
 * Warning Popup
 */
customAlert.warning = (
  title: string,
  message?: string,
  onConfirm?: () => void,
  confirmText: string = 'Understood'
) => {
  customAlert({
    title,
    message,
    type: 'warning',
    confirmText,
    onConfirm,
  });
};

/**
 * Information Popup
 */
customAlert.info = (
  title: string,
  message?: string,
  onConfirm?: () => void,
  confirmText: string = 'OK'
) => {
  customAlert({
    title,
    message,
    type: 'info',
    confirmText,
    onConfirm,
  });
};

/**
 * Confirmation Popup with two buttons (Confirm & Cancel)
 */
customAlert.confirm = (
  title: string,
  message?: string,
  onConfirm?: () => void | Promise<void>,
  onCancel?: () => void,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel',
  isDestructive: boolean = false
) => {
  customAlert({
    title,
    message,
    type: 'confirmation',
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    destructive: isDestructive,
  });
};

/**
 * Loading Popup (animated indicator, dismiss disabled to avoid duplicate actions)
 */
customAlert.loading = (
  title: string = 'Processing...',
  message?: string
) => {
  customAlert({
    title,
    message,
    type: 'loading',
    dismissible: false,
  });
};

/**
 * Programmatically dismiss any active custom alert or loading modal
 */
customAlert.dismiss = () => {
  if (globalAlertListener) {
    globalAlertListener(null);
  }
};

customAlert.close = customAlert.dismiss;
customAlert.hideLoading = customAlert.dismiss;

/**
 * WhatsApp Helpline Popup
 */
customAlert.whatsapp = (options?: {
  title?: string;
  subtitle?: string;
  description?: string;
  phone?: string;
  displayNumber?: string;
  role?: 'customer' | 'mechanic';
  context?: string;
  onCancel?: () => void;
}) => {
  const role = options?.role ?? 'customer';
  const rawPhone = options?.phone ?? '923390892660';
  const displayNumber = options?.displayNumber ?? '0339 0892660';
  const title = options?.title ?? 'AutoCares WhatsApp Helpline';
  const subtitle = options?.subtitle ?? '24/7 Roadside Assistance';
  const description =
    options?.description ??
    'Connect with our support team for instant assistance with vehicle breakdowns, mechanic coordination, and live dispatch.';

  const defaultMsg =
    role === 'mechanic'
      ? `Assalam-o-Alaikum AutoCares Dispatch! I am an AutoCares mechanic needing roadside dispatch assistance.${options?.context ? ` Details: ${options.context}` : ''}`
      : `Assalam-o-Alaikum AutoCares Roadside Assistance! I need help with my vehicle.${options?.context ? ` Details: ${options.context}` : ''}`;

  customAlert({
    title,
    subtitle,
    message: description,
    type: 'whatsapp',
    whatsappPhone: rawPhone,
    whatsappMessage: defaultMsg,
    displayNumber,
    confirmText: 'Open WhatsApp',
    cancelText: 'Maybe Later',
    onCancel: options?.onCancel,
    onConfirm: async () => {
      const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(defaultMsg)}`;
      try {
        await Linking.openURL(url);
      } catch {
        customAlert.error(
          'Could Not Open WhatsApp',
          `WhatsApp is not installed or could not open. You can call our 24/7 helpline directly at ${displayNumber}.`
        );
      }
    },
  });
};

/**
 * Global CustomAlertModal Component
 * Must be mounted once in the root layout (_layout.tsx).
 */
export function CustomAlertModal() {
  const [alert, setAlert] = useState<CustomAlertOptions | null>(null);
  const [scale] = useState(() => new Animated.Value(0.88));
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(14));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Pulsing animation for live status dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const close = useCallback((callback?: () => void | Promise<void>) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 14,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlert(null);
      if (callback) {
        callback();
      }
    });
  }, [opacity, scale, translateY]);

  useEffect(() => {
    return registerAlertListener((newAlert) => {
      if (newAlert) {
        setAlert(newAlert);
        if (Platform.OS !== 'web') {
          try {
            Vibration.vibrate(60);
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
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        close();
      }
    });
  }, [close, opacity, scale, translateY]);

  if (!alert) return null;

  const type = alert.type ?? 'info';
  const isDestructive =
    alert.destructive ||
    (alert.buttons?.some((b) => b.style === 'destructive') ?? false);

  // Type configuration
  const typeConfig = {
    success: {
      icon: 'checkmark-circle' as const,
      isFontAwesome: false,
      color: '#10B981', // Emerald green
      bg: '#ECFDF5',
      border: '#A7F3D0',
      badgeText: alert.badgeText ?? 'SUCCESS',
      badgeColor: '#065F46',
      badgeBg: '#D1FAE5',
      primaryBtnBg: '#10B981',
    },
    error: {
      icon: 'close-circle' as const,
      isFontAwesome: false,
      color: '#EF4444', // Red
      bg: '#FEF2F2',
      border: '#FECACA',
      badgeText: alert.badgeText ?? 'ERROR',
      badgeColor: '#991B1B',
      badgeBg: '#FEE2E2',
      primaryBtnBg: '#DC2626',
    },
    warning: {
      icon: 'warning' as const,
      isFontAwesome: false,
      color: '#FF9800', // AutoCares Orange
      bg: '#FFFBEB',
      border: '#FDE68A',
      badgeText: alert.badgeText ?? 'WARNING',
      badgeColor: '#92400E',
      badgeBg: '#FEF3C7',
      primaryBtnBg: '#FF9800',
    },
    info: {
      icon: 'information-circle' as const,
      isFontAwesome: false,
      color: '#38B8E8', // AutoCares Sky Blue
      bg: '#EBF8FD',
      border: '#BAE6FD',
      badgeText: alert.badgeText ?? 'INFORMATION',
      badgeColor: '#0369A1',
      badgeBg: '#E0F2FE',
      primaryBtnBg: '#38B8E8',
    },
    confirmation: {
      icon: isDestructive ? ('trash-outline' as const) : ('help-circle' as const),
      isFontAwesome: false,
      color: isDestructive ? '#DC2626' : '#38B8E8',
      bg: isDestructive ? '#FEF2F2' : '#EBF8FD',
      border: isDestructive ? '#FECACA' : '#BAE6FD',
      badgeText: alert.badgeText ?? (isDestructive ? 'CONFIRM ACTION' : 'CONFIRMATION'),
      badgeColor: isDestructive ? '#991B1B' : '#0369A1',
      badgeBg: isDestructive ? '#FEE2E2' : '#E0F2FE',
      primaryBtnBg: isDestructive ? '#DC2626' : '#38B8E8',
    },
    loading: {
      icon: 'sync' as const,
      isFontAwesome: false,
      color: '#38B8E8',
      bg: '#EBF8FD',
      border: '#BAE6FD',
      badgeText: alert.badgeText ?? 'PROCESSING',
      badgeColor: '#0369A1',
      badgeBg: '#E0F2FE',
      primaryBtnBg: '#38B8E8',
    },
    whatsapp: {
      icon: 'whatsapp' as const,
      isFontAwesome: true,
      color: '#25D366', // WhatsApp Official Green
      bg: '#E8F8F0',
      border: '#86EFAC',
      badgeText: alert.badgeText ?? 'AVAILABLE 24/7',
      badgeColor: '#15803D',
      badgeBg: '#DCFCE7',
      primaryBtnBg: '#25D366',
    },
  }[type];

  // Resolve buttons list
  let buttons: AlertButton[] = [];
  if (type === 'loading') {
    buttons = []; // No buttons for loading state
  } else if (alert.buttons && alert.buttons.length > 0) {
    buttons = alert.buttons;
  } else if (type === 'confirmation' || alert.cancelText || alert.onCancel) {
    buttons = [
      {
        text: alert.cancelText ?? 'Cancel',
        style: 'cancel',
        onPress: alert.onCancel,
      },
      {
        text: alert.confirmText ?? (isDestructive ? 'Delete' : 'Confirm'),
        style: isDestructive ? 'destructive' : 'primary',
        onPress: alert.onConfirm,
      },
    ];
  } else {
    buttons = [
      {
        text: alert.confirmText ?? 'OK',
        style: 'primary',
        onPress: alert.onConfirm,
      },
    ];
  }

  const dismissible = alert.dismissible ?? (type !== 'loading');

  // Handle outside or back press: MUST execute onCancel or simply close, NEVER onConfirm
  const handleDismiss = () => {
    if (!dismissible) return;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    if (cancelBtn?.onPress) {
      close(cancelBtn.onPress);
    } else if (alert.onCancel) {
      close(alert.onCancel);
    } else if (buttons.length === 1 && buttons[0].style !== 'destructive') {
      // For simple one-button informational alert, dismissing resolves the single action
      close(buttons[0].onPress);
    } else {
      close();
    }
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        {/* Animated Dim Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable
            style={styles.backdropPressable}
            onPress={handleDismiss}
            disabled={!dismissible}
          />
        </Animated.View>

        {/* Modal Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity,
              transform: [{ scale }, { translateY }],
            },
          ]}>
          <View style={styles.card}>
            {/* Top Accent Strip */}
            <View style={[styles.topAccentBar, { backgroundColor: typeConfig.color }]} />

            {/* Hero Icon Container */}
            <View
              style={[
                styles.iconBoxOuter,
                { backgroundColor: typeConfig.bg, borderColor: typeConfig.border },
              ]}>
              <View style={[styles.iconBoxInner, { backgroundColor: typeConfig.color }]}>
                {type === 'loading' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : typeConfig.isFontAwesome ? (
                  <FontAwesome name="whatsapp" size={30} color="#FFFFFF" />
                ) : (
                  <Ionicons name={typeConfig.icon as any} size={28} color="#FFFFFF" />
                )}
              </View>
            </View>

            {/* Status / Category Badge Pill */}
            <View style={[styles.badgePill, { backgroundColor: typeConfig.badgeBg }]}>
              {type === 'whatsapp' && (
                <Animated.View
                  style={[styles.liveDot, { opacity: pulseAnim, backgroundColor: '#22C55E' }]}
                />
              )}
              {type === 'loading' && (
                <View style={[styles.liveDot, { backgroundColor: '#0284C7' }]} />
              )}
              <Text style={[styles.badgeText, { color: typeConfig.badgeColor }]}>
                {typeConfig.badgeText}
              </Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>{alert.title}</Text>
            {alert.subtitle ? <Text style={styles.subtitle}>{alert.subtitle}</Text> : null}

            {/* Message Description */}
            {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            {/* WhatsApp Helpline Info Card */}
            {type === 'whatsapp' && (
              <View style={styles.whatsappCard}>
                <View style={styles.whatsappCardRow}>
                  <View style={styles.whatsappCardIcon}>
                    <Ionicons name="call" size={16} color="#16A34A" />
                  </View>
                  <View style={styles.whatsappCardDetails}>
                    <Text style={styles.whatsappCardPhone}>
                      {alert.displayNumber ?? '0339 0892660'}
                    </Text>
                    <Text style={styles.whatsappCardLabel}>
                      Official AutoCares 24/7 Roadside Control Room
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Loading Indicator Spinner Area */}
            {type === 'loading' && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#38B8E8" />
                <Text style={styles.loadingSub}>Please wait a moment...</Text>
              </View>
            )}

            {/* Action Buttons */}
            {buttons.length > 0 && (
              <View
                style={[
                  styles.buttonRow,
                  buttons.length === 2
                    ? styles.buttonRowTwo
                    : buttons.length > 2
                    ? styles.buttonRowStack
                    : styles.buttonRowSingle,
                ]}>
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestruct = btn.style === 'destructive';
                  const isWhatsappBtn = btn.style === 'whatsapp' || type === 'whatsapp';

                  let btnBg = typeConfig.primaryBtnBg;
                  let btnTextColor = '#FFFFFF';
                  let btnBorderColor = 'transparent';

                  if (isCancel) {
                    btnBg = '#F1F5F9';
                    btnTextColor = '#334155';
                    btnBorderColor = '#E2E8F0';
                  } else if (isDestruct) {
                    btnBg = '#DC2626';
                    btnTextColor = '#FFFFFF';
                  } else if (isWhatsappBtn && !isCancel) {
                    btnBg = '#25D366';
                    btnTextColor = '#FFFFFF';
                  }

                  return (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.btn,
                        buttons.length === 2 && styles.btnHalf,
                        buttons.length === 1 && styles.btnFull,
                        buttons.length > 2 && styles.btnStack,
                        {
                          backgroundColor: btnBg,
                          borderColor: btnBorderColor,
                          borderWidth: isCancel ? 1 : 0,
                        },
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => close(btn.onPress)}>
                      <View style={styles.btnContent}>
                        {isWhatsappBtn && !isCancel && (
                          <FontAwesome
                            name="whatsapp"
                            size={18}
                            color="#FFFFFF"
                            style={styles.btnIcon}
                          />
                        )}
                        <Text style={[styles.btnText, { color: btnTextColor }]}>{btn.text}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', // Deep slate overlay
  },
  backdropPressable: {
    flex: 1,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 356,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 26,
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
    height: 4.5,
  },
  iconBoxOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBoxInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: theme.radius.pill,
    marginBottom: 8,
    gap: 5,
  },
  liveDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  whatsappCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  whatsappCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whatsappCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappCardDetails: {
    flex: 1,
  },
  whatsappCardPhone: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  whatsappCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#166534',
    marginTop: 1,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  buttonRow: {
    width: '100%',
    marginTop: 4,
  },
  buttonRowSingle: {
    flexDirection: 'row',
  },
  buttonRowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonRowStack: {
    flexDirection: 'column',
    gap: 8,
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
  btnStack: {
    width: '100%',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  btnIcon: {
    marginRight: 2,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
