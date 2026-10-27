import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/autocares-theme';
import {
  callParticipant,
  getShortRequestRef,
  openWhatsAppChat,
  type WhatsAppContactRole,
} from '../lib/whatsapp';

interface WhatsAppContactCardProps {
  role: WhatsAppContactRole; // 'customer' = customer contacting mechanic; 'mechanic' = mechanic contacting customer
  requestId: string;
  phone: string | null | undefined;
  participantName?: string | null;
  status?: string;
  vehicleDetails?: string | null;
  compact?: boolean; // compact variant for dashboard cards
}

export default function WhatsAppContactCard({
  role,
  requestId,
  phone,
  participantName,
  status,
  vehicleDetails,
  compact = false,
}: WhatsAppContactCardProps) {
  const isCustomer = role === 'customer';
  const targetLabel = participantName
    ? participantName
    : isCustomer
    ? 'Assigned Mechanic'
    : 'Customer';
  const requestRef = getShortRequestRef(requestId);

  function handleWhatsApp() {
    openWhatsAppChat({
      phone,
      participantName: targetLabel,
      role,
      requestId,
    });
  }

  function handleCall() {
    callParticipant(phone, targetLabel);
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeaderRow}>
          <View style={styles.compactNameBlock}>
            <View style={styles.avatarMini}>
              <Ionicons
                name={isCustomer ? 'construct' : 'person'}
                size={14}
                color={theme.colors.primaryDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compactLabel}>
                {isCustomer ? 'Assigned Mechanic' : 'Customer'}
              </Text>
              <Text style={styles.compactName} numberOfLines={1}>
                {targetLabel}
              </Text>
            </View>
          </View>
          <View style={styles.refPill}>
            <Text style={styles.refPillText}>{requestRef}</Text>
          </View>
        </View>

        <View style={styles.compactButtonsRow}>
          <Pressable
            onPress={handleWhatsApp}
            style={({ pressed }) => [styles.whatsappBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${targetLabel} on WhatsApp`}>
            <FontAwesome name="whatsapp" size={16} color="#FFFFFF" />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </Pressable>

          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [styles.callBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${targetLabel}`}>
            <Ionicons name="call" size={15} color={theme.colors.text} />
            <Text style={styles.callBtnText}>Call</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarLarge}>
          <Ionicons
            name={isCustomer ? 'construct' : 'person'}
            size={22}
            color={theme.colors.primaryDark}
          />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.participantName} numberOfLines={1}>
              {targetLabel}
            </Text>
            <View style={styles.refPill}>
              <Text style={styles.refPillText}>{requestRef}</Text>
            </View>
          </View>
          <Text style={styles.roleSubtext}>
            {isCustomer ? 'AutoCares Certified Mechanic' : 'Assistance Requester'}
            {status ? ` · ${status.replace('_', ' ').toUpperCase()}` : ''}
          </Text>
          {vehicleDetails ? (
            <Text style={styles.vehicleText} numberOfLines={1}>
              Vehicle: {vehicleDetails}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [styles.fullWhatsAppBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Chat with ${targetLabel} on WhatsApp`}>
          <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.fullWhatsAppBtnText}>Chat on WhatsApp</Text>
        </Pressable>

        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.fullCallBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Call ${targetLabel}`}>
          <Ionicons name="call-outline" size={18} color={theme.colors.text} />
          <Text style={styles.fullCallBtnText}>Call Phone</Text>
        </Pressable>
      </View>

      <View style={styles.guidanceBox}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.muted} />
        <Text style={styles.guidanceText}>
          Tapping WhatsApp opens your WhatsApp application with a pre-filled request reference.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  roleSubtext: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  vehicleText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  refPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  fullWhatsAppBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: '#25D366', // WhatsApp Official Green
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWhatsAppBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  fullCallBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fullCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  guidanceText: {
    fontSize: 11,
    color: theme.colors.muted,
    lineHeight: 15,
    flex: 1,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  // Compact variant styles for dashboard cards
  compactContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactNameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  compactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsappBtn: {
    flex: 1.2,
    height: 38,
    backgroundColor: '#25D366',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  callBtn: {
    flex: 0.8,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
