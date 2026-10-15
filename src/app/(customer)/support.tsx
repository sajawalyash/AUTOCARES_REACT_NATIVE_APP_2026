import { useState } from 'react';
import { Alert } from 'react-native';

import {
  Field,
  Label,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { createSupportTicket } from '../../lib/support';
import { useAuth } from '../../providers/auth-provider';

export default function SupportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user || !subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Subject and message are required.');
      return;
    }
    setSaving(true);
    const { error } = await createSupportTicket({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Failed', error);
      return;
    }
    Alert.alert('Sent', 'Support will get back to you.');
    setSubject('');
    setMessage('');
  }

  return (
    <Screen>
      <Title>Contact support</Title>
      <Subtitle>Send a message to the AutoCares team.</Subtitle>
      <Label>Subject</Label>
      <Field value={subject} onChangeText={setSubject} placeholder="How can we help?" />
      <Label>Message</Label>
      <Field
        value={message}
        onChangeText={setMessage}
        placeholder="Describe your issue"
        multiline
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <PrimaryButton label={saving ? 'Sending…' : 'Send'} onPress={submit} disabled={saving} />
    </Screen>
  );
}
