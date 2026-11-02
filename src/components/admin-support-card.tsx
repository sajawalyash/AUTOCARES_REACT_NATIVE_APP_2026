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
  showPhone?: boolean;
}

export default function AdminSupportCard({
  role = 'customer',
  context,
  compact = false,
  style,
  title,
  subtitle,
  showPhone = false,
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
          <View style={styles.hoursTag}>
            <Ionicons name="shield-checkmark" size={11} color="#166534" />
            <Text style={styles.hoursTagText}>Official 24/7</Text>
          </View>
        </View>

        {showPhone && (
          <Text style={styles.helplinePhoneCompact}>{AUTOCARES_SUPPORT_CONFIG.formatted}</Text>
        )}

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
            accessibilityLabel="Call AutoCares Helpline">
            <Ionicons name="call" size={13} color="#0F172A" />
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
          <Text style={styles.liveBadgeText}>ADMIN SUPPORT 24/7</Text>
        </View>
        <View style={styles.hoursTag}>
          <Ionicons name="shield-checkmark" size={13} color="#166534" />
          <Text style={styles.hoursTagText}>24/7 Official Helpline</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="headset" size={22} color="#15803D" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title ?? 'AutoCares Admin Helpline'}</Text>
          {showPhone && (
            <Text style={styles.phoneHighlight}>
              📞 {AUTOCARES_SUPPORT_CONFIG.formatted}
            </Text>
          )}
          <Text style={styles.message} numberOfLines={3}>
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
          <View style={styles.btnContent}>
            <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.whatsAppBtnText}>WhatsApp Support</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.callBtn, pressed && styles.btnPressed]}
          onPress={handleCall}
          accessibilityRole="button"
          accessibilityLabel="Call AutoCares Helpline">
          <View style={styles.btnContent}>
            <Ionicons name="call" size={15} color="#0F172A" />
            <Text style={styles.callBtnText}>Call Helpline</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 14,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
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
    letterSpacing: 0.4,
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
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  phoneHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsAppBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 6,
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
    height: 36,
    gap: 6,
  },
  compactCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 36,
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
    color: '#0F172A',
  },
});
