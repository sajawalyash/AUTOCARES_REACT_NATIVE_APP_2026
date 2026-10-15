import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Field, Label, PrimaryButton, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { publishAnnouncement, recordAdminActivity } from '../../../lib/admin';
import type { UserRole } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const audiences: { id: UserRole | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'customer', label: 'Customers' },
  { id: 'mechanic', label: 'Mechanics' },
];

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing details', 'Enter an announcement title and message.');
      return;
    }
    setSending(true);
    const result = await publishAnnouncement({ title, body, role });
    setSending(false);
    if (result.error) {
      if (result.recipientCount && user) {
        const log = await recordAdminActivity({
          actor_id: user.id,
          action: 'partially sent announcement',
          entity_type: 'announcement',
          details: {
            title: title.trim(),
            audience: role,
            recipient_count: result.recipientCount,
            error: result.error,
          },
        });
        if (log.error) {
          Alert.alert('Partial send and activity log failed', `${result.error}\n${log.error}`);
          return;
        }
      }
      Alert.alert(
        result.recipientCount ? 'Announcement partially sent' : 'Could not send announcement',
        result.recipientCount
          ? `Sent to ${result.recipientCount} users before an error: ${result.error}`
          : result.error
      );
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: 'sent announcement',
        entity_type: 'announcement',
        details: { title: title.trim(), audience: role, recipient_count: result.recipientCount },
      });
      if (log.error) {
        Alert.alert('Announcement sent, but activity log failed', log.error);
        return;
      }
    }
    Alert.alert('Announcement sent', `Delivered to ${result.recipientCount} users.`);
    setTitle('');
    setBody('');
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Announcements</Title>
        <Subtitle>Send an in-app notification to all users or a selected role.</Subtitle>
        <Card>
          <Label>Audience</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {audiences.map((audience) => {
              const selected = role === audience.id;
              return (
                <Pressable
                  key={audience.id}
                  onPress={() => setRole(audience.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.blue : theme.colors.border,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: selected ? theme.colors.secondary : theme.colors.surface,
                  }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{audience.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field value={title} onChangeText={setTitle} placeholder="Announcement title" />
          <Field
            value={body}
            onChangeText={setBody}
            placeholder="Write the message"
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <PrimaryButton label={sending ? 'Sending…' : 'Send announcement'} onPress={send} disabled={sending} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
