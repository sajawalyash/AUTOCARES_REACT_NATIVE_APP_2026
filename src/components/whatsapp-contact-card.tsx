import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './avatar';
import { theme } from '../constants/autocares-theme';
import {
  callParticipant,
  getShortRequestRef,
  normalizePhoneNumber,
  openWhatsAppChat,
  type WhatsAppContactRole,
} from '../lib/whatsapp';

export interface WhatsAppContactCardProps {
  role: WhatsAppContactRole; // 'customer' = customer contacting mechanic; 'mechanic' = mechanic contacting customer
  requestId: string;
  phone: string | null | undefined;
  participantName?: string | null;
  avatarUrl?: string | null;
  workshopName?: string | null;
  specialization?: string | null;
  vehicleType?: string | null;
  vehicleDetails?: string | null;
  problemDescription?: string | null;
  locationText?: string | null;
  status?: string;
  compact?: boolean;
}

export default function WhatsAppContactCard({
  role,
  requestId,
  phone,
  participantName,
  avatarUrl,
  workshopName,
  specialization,
  vehicleType,
  vehicleDetails,
  problemDescription,
  locationText,
  status,
  compact = false,
}: WhatsAppContactCardProps) {
  const isCustomer = role === 'customer';
  const targetLabel = participantName
    ? participantName
    : isCustomer
    ? 'Assigned Mechanic'
    : 'Customer';
  const requestRef = getShortRequestRef(requestId);

  // Check if request is accepted or in active progress
  const isAcceptedOrActive =
    !status ||
    ['accepted', 'on_the_way', 'en_route', 'arrived', 'in_progress', 'completed'].includes(status);

  const { isValid, formatted } = normalizePhoneNumber(phone);
  const displayPhone = isValid && formatted
    ? formatted.startsWith('92')
      ? `0${formatted.slice(2, 5)} ${formatted.slice(5)}`
      : formatted
    : phone || 'Phone not provided';

  const isTwoWheeler =
    vehicleType?.toLowerCase().includes('bike') ||
    vehicleType?.toLowerCase().includes('scooter');

  function handleWhatsApp() {
    if (!isAcceptedOrActive) return;
    openWhatsAppChat({
      phone,
      participantName: targetLabel,
      role,
      requestId,
    });
  }

  function handleCall() {
    if (!isAcceptedOrActive) return;
    callParticipant(phone, targetLabel);
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {/* Header Block */}
        <View style={styles.compactHeaderRow}>
          <View style={styles.compactNameBlock}>
            {avatarUrl ? (
              <Avatar url={avatarUrl} name={targetLabel} size={38} />
            ) : (
              <View style={styles.avatarMini}>
                <Ionicons
                  name={isCustomer ? 'construct' : 'person'}
                  size={16}
                  color={theme.colors.primaryDark}
                />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.compactLabel}>
                  {isCustomer ? 'Assigned Mechanic' : 'Customer'}
                </Text>
                {workshopName ? (
                  <Text style={styles.compactWorkshop} numberOfLines={1}>
                    · {workshopName}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.compactName} numberOfLines={1}>
                {targetLabel}
              </Text>
              <Text style={styles.compactPhoneText}>📞 {displayPhone}</Text>
            </View>
          </View>

          <View style={styles.refPill}>
            <Text style={styles.refPillText}>{requestRef}</Text>
          </View>
        </View>

        {/* Customer Vehicle Tag for Mechanic View */}
        {!isCustomer && (vehicleType || vehicleDetails) && (
          <View style={styles.compactVehicleRow}>
            <View style={styles.compactVehicleBadge}>
              <Ionicons
                name={isTwoWheeler ? 'bicycle' : 'car'}
                size={12}
                color="#0284C7"
              />
              <Text style={styles.compactVehicleBadgeText}>
                {(vehicleType || 'VEHICLE').toUpperCase()}
              </Text>
            </View>
            {vehicleDetails ? (
              <Text style={styles.compactVehicleDetailsText} numberOfLines={1}>
                {vehicleDetails}
              </Text>
            ) : null}
          </View>
        )}

        {/* Action Buttons: Live WhatsApp Chat & Call */}
        {isAcceptedOrActive ? (
          <View style={styles.compactButtonsRow}>
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [styles.whatsappBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${targetLabel} on WhatsApp`}>
              <FontAwesome name="whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.whatsappBtnText}>WhatsApp Chat</Text>
            </Pressable>

            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [styles.callBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${targetLabel}`}>
              <Ionicons name="call" size={14} color="#0F172A" />
              <Text style={styles.callBtnText}>Call Now</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.awaitingNoticeBox}>
            <Text style={styles.awaitingNoticeText}>
              Direct contact details unlocked upon request acceptance.
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header with Avatar & Details */}
      <View style={styles.cardHeader}>
        {avatarUrl ? (
          <Avatar url={avatarUrl} name={targetLabel} size={52} />
        ) : (
          <View style={styles.avatarLarge}>
            <Ionicons
              name={isCustomer ? 'construct' : 'person'}
              size={26}
              color={theme.colors.primaryDark}
            />
          </View>
        )}

        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.participantName} numberOfLines={1}>
              {targetLabel}
            </Text>
            <View style={styles.refPill}>
              <Text style={styles.refPillText}>{requestRef}</Text>
            </View>
          </View>

          {/* Subtitle / Workshop / Role */}
          <Text style={styles.roleSubtext}>
            {isCustomer
              ? workshopName
                ? `${workshopName} · AutoCares Mechanic`
                : 'AutoCares Certified Mechanic'
              : 'Assistance Requester'}
            {specialization ? ` · ${specialization}` : ''}
          </Text>

          {/* Phone Display */}
          <Text style={styles.phoneRowText}>
            📞 Contact: <Text style={styles.phoneRowNumber}>{displayPhone}</Text>
          </Text>
        </View>
      </View>

      {/* Extra Details Context Section */}
      <View style={styles.detailsSection}>
        {/* For Mechanic viewing Customer: Prominent Vehicle & Location Details */}
        {!isCustomer && (
          <>
            <View style={styles.vehicleHighlightBox}>
              <View style={styles.vehicleBadgeRow}>
                <View style={styles.vehicleTypeBadge}>
                  <Ionicons
                    name={isTwoWheeler ? 'bicycle' : 'car'}
                    size={14}
                    color="#0284C7"
                  />
                  <Text style={styles.vehicleTypeBadgeText}>
                    {(vehicleType || 'VEHICLE').toUpperCase()}
                  </Text>
                </View>
                {vehicleDetails ? (
                  <Text style={styles.vehicleDetailsText} numberOfLines={1}>
                    {vehicleDetails}
                  </Text>
                ) : null}
              </View>
            </View>

            {problemDescription && (
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle-outline" size={15} color={theme.colors.orange} />
                <Text style={styles.detailText} numberOfLines={2}>
                  Problem: <Text style={{ fontWeight: '700' }}>{problemDescription}</Text>
                </Text>
              </View>
            )}
          </>
        )}

        {/* Location / ETA Row for Both */}
        {locationText && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.detailText}>{locationText}</Text>
          </View>
        )}
      </View>

      {/* Communication Buttons (WhatsApp Chat & Call Now) */}
      {isAcceptedOrActive ? (
        <View style={styles.buttonsRow}>
          <Pressable
            onPress={handleWhatsApp}
            style={({ pressed }) => [styles.fullWhatsAppBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${targetLabel} on WhatsApp`}>
            <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.fullWhatsAppBtnText}>Live WhatsApp Chat</Text>
          </Pressable>

          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [styles.fullCallBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${targetLabel}`}>
            <Ionicons name="call" size={17} color="#0F172A" />
            <Text style={styles.fullCallBtnText}>Call Customer</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.awaitingNoticeBox}>
          <Ionicons name="lock-closed-outline" size={14} color="#64748B" />
          <Text style={styles.awaitingNoticeText}>
            Direct contact actions will be available once the request is accepted.
          </Text>
        </View>
      )}

      {/* Guidance info caption */}
      <View style={styles.guidanceBox}>
        <Ionicons name="shield-checkmark-outline" size={13} color="#15803D" />
        <Text style={styles.guidanceText}>
          Direct two-way live coordination enabled. All communication is private.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  roleSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  phoneRowText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  phoneRowNumber: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 13.5,
  },
  detailsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  vehicleHighlightBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  vehicleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  vehicleTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  vehicleDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12.5,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fullWhatsAppBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 14,
    height: 46,
    gap: 8,
    ...theme.shadows.card,
  },
  fullWhatsAppBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    height: 46,
    gap: 6,
  },
  fullCallBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  guidanceText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  refPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.4,
  },
  awaitingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  awaitingNoticeText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  compactContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
    marginTop: 8,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactNameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  compactWorkshop: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    flex: 1,
  },
  compactName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactPhoneText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  compactVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  compactVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactVehicleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  compactVehicleDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  compactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsappBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    height: 38,
    gap: 6,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    height: 38,
    gap: 6,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
