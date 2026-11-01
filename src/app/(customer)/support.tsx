import AdminSupportCard from '../../components/admin-support-card';
import { useState } from 'react';

import {
  Field,
  Label,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { createSupportTicket } from '../../lib/support';
import { customAlert } from '../../components/custom-alert';
import { useAuth } from '../../providers/auth-provider';

export default function SupportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user || !subject.trim() || !message.trim()) {
      customAlert.warning('Missing fields', 'Subject and message are required.');
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
      customAlert.error('Failed', error);
      return;
    }
    customAlert.success('Sent', 'Support will get back to you.');
    setSubject('');
    setMessage('');
  }

  return (
    <Screen>
      <AdminSupportCard role="customer" style={{ marginBottom: 14 }} />
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
