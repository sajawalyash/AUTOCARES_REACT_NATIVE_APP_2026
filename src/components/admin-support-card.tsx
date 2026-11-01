import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '../constants/autocares-theme';
import {
  AUTOCARES_SUPPORT_CONFIG,
  callAdminHelpline,
  openWhatsAppSupport,
} from '../lib/whatsapp';

export interface AdminSupportCardProps {
  role?: 'customer' | 'mechanic';
  context?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
  subtitle?: string;
}

export default function AdminSupportCard({
  role = 'customer',
  context,
  compact = false,
  style,
  title,
  subtitle,
}: AdminSupportCardProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));

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

  function handleWhatsApp() {
    openWhatsAppSupport(role, context);
  }

  function handleCall() {
    callAdminHelpline();
  }

  if (compact) {
    return (
      <View style={[styles.compactCard, style]}>
        <View style={styles.compactHeader}>
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveBadgeText}>{AUTOCARES_SUPPORT_CONFIG.badge}</Text>
          </View>
          <Text style={styles.helplinePhoneCompact}>{AUTOCARES_SUPPORT_CONFIG.formatted}</Text>
        </View>

        <View style={styles.compactButtonsRow}>
          <Pressable
            style={({ pressed }) => [styles.compactWhatsAppBtn, pressed && styles.btnPressed]}
            onPress={handleWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="Chat with AutoCares Admin on WhatsApp">
            <FontAwesome name="whatsapp" size={16} color="#FFFFFF" />
            <Text style={styles.compactBtnText}>WhatsApp Support</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.compactCallBtn, pressed && styles.btnPressed]}
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel={`Call AutoCares Helpline at ${AUTOCARES_SUPPORT_CONFIG.formatted}`}>
            <Ionicons name="call" size={14} color="#15803D" />
            <Text style={styles.compactCallBtnText}>Call Helpline</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {/* Top Banner Row with 24/7 Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveBadgeText}>{AUTOCARES_SUPPORT_CONFIG.badge}</Text>
        </View>
        <View style={styles.hoursTag}>
          <Ionicons name="shield-checkmark" size={12} color="#166534" />
          <Text style={styles.hoursTagText}>24/7 Official</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="headset" size={24} color="#15803D" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title ?? 'AutoCares Admin Helpline'}</Text>
          <Text style={styles.phoneHighlight}>
            📞 {AUTOCARES_SUPPORT_CONFIG.formatted}{' '}
            <Text style={styles.phoneInternational}>({AUTOCARES_SUPPORT_CONFIG.international})</Text>
          </Text>
          <Text style={styles.message}>
            {subtitle ?? AUTOCARES_SUPPORT_CONFIG.message}
          </Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.buttonsRow}>
        <Pressable
          style={({ pressed }) => [styles.whatsAppBtn, pressed && styles.btnPressed]}
          onPress={handleWhatsApp}
          accessibilityRole="button"
          accessibilityLabel="Open WhatsApp Support with AutoCares Admin">
          <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsAppBtnText}>WhatsApp Admin Support</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.callBtn, pressed && styles.btnPressed]}
          onPress={handleCall}
          accessibilityRole="button"
          accessibilityLabel={`Call AutoCares Helpline at ${AUTOCARES_SUPPORT_CONFIG.formatted}`}>
          <Ionicons name="call-outline" size={18} color="#0F172A" />
          <Text style={styles.callBtnText}>Call Helpline</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 16,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  hoursTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hoursTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  phoneHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  phoneInternational: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  message: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsAppBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 12,
    ...theme.shadows.card,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helplinePhoneCompact: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  compactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    height: 38,
    gap: 6,
  },
  compactCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    height: 38,
    gap: 6,
  },
  compactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
});
