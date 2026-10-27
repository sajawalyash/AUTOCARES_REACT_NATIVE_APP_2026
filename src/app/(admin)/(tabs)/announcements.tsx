import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AdminSubscreenHeader from '../../../components/admin-subscreen-header';
import { Card, Screen } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { publishAnnouncement, recordAdminActivity } from '../../../lib/admin';
import type { UserRole } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const AUDIENCES: { id: UserRole | 'all'; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    id: 'all',
    label: 'Everyone',
    description: 'Broadcast to all registered users (customers and mechanics)',
    icon: 'people-outline',
  },
  {
    id: 'customer',
    label: 'Customers only',
    description: 'Send only to registered vehicle owners and customers',
    icon: 'car-outline',
  },
  {
    id: 'mechanic',
    label: 'Mechanics only',
    description: 'Send only to verified and registered mechanics',
    icon: 'construct-outline',
  },
];

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      Alert.alert('Missing details', 'Please enter both an announcement title and a message body.');
      return;
    }

    Alert.alert(
      'Confirm broadcast',
      `Are you sure you want to broadcast this announcement to "${AUDIENCES.find((a) => a.id === role)?.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Announcement',
          onPress: async () => {
            setSending(true);
            const result = await publishAnnouncement({
              title: trimmedTitle,
              body: trimmedBody,
              role,
            });
            setSending(false);

            if (result.error && !result.recipientCount) {
              Alert.alert('Could not send announcement', result.error);
              return;
            }

            // Successfully delivered (or partial)
            const deliveredCount = result.recipientCount ?? 0;

            // Clear inputs immediately to avoid accidental resend
            setTitle('');
            setBody('');

            // Non-blocking activity log
            if (user) {
              recordAdminActivity({
                actor_id: user.id,
                action: 'sent announcement',
                entity_type: 'announcement',
                details: {
                  title: trimmedTitle,
                  audience: role,
                  recipient_count: deliveredCount,
                  error: result.error ?? null,
                },
              }).catch(() => {});
            }

            if (result.error) {
              Alert.alert(
                'Partially delivered',
                `Delivered to ${deliveredCount} users before an error occurred: ${result.error}`
              );
            } else {
              Alert.alert(
                'Announcement broadcasted',
                `Delivered successfully to ${deliveredCount} user${deliveredCount === 1 ? '' : 's'}.`
              );
            }
          },
        },
      ]
    );
  }

  const selectedAudience = AUDIENCES.find((a) => a.id === role);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AdminSubscreenHeader
          title="Broadcast announcements"
          subtitle="Send official push and in-app system notifications to your platform users."
        />

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Select Target Audience</Text>
          <View style={styles.audienceList}>
            {AUDIENCES.map((audience) => {
              const selected = role === audience.id;
              return (
                <Pressable
                  key={audience.id}
                  onPress={() => setRole(audience.id)}
                  style={[styles.audienceCard, selected && styles.audienceCardSelected]}>
                  <View style={[styles.audienceIconCircle, selected && styles.audienceIconCircleSelected]}>
                    <Ionicons
                      name={audience.icon}
                      size={18}
                      color={selected ? '#FFFFFF' : theme.colors.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.audienceTitle, selected && styles.audienceTitleSelected]}>
                      {audience.label}
                    </Text>
                    <Text style={styles.audienceDesc}>{audience.description}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? theme.colors.primary : theme.colors.border}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Announcement Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. System Maintenance Notice"
            placeholderTextColor={theme.colors.muted}
            maxLength={100}
            style={styles.input}
          />

          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>Message Content</Text>
            <Text style={styles.counterText}>{body.length}/500</Text>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your announcement details here…"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={4}
            maxLength={500}
            style={[styles.input, styles.multilineInput]}
          />

          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Ionicons name="notifications-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.previewHeaderText}>Preview: {selectedAudience?.label}</Text>
            </View>
            <Text style={styles.previewTitle}>{title.trim() || 'Untitled Announcement'}</Text>
            <Text style={styles.previewBody}>{body.trim() || 'Message body preview will appear here.'}</Text>
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              (!title.trim() || !body.trim() || sending) && styles.sendButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}>
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Announcement</Text>
              </>
            )}
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  counterText: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  audienceList: {
    gap: 8,
    marginBottom: 16,
  },
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  audienceCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  audienceIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceIconCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  audienceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  audienceTitleSelected: {
    color: theme.colors.primaryDark,
  },
  audienceDesc: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 1,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    color: theme.colors.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  previewBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    ...theme.shadows.primaryButton,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
