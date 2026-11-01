import AdminSupportCard from '../../components/admin-support-card';
import { useState } from 'react';

import { Field, Label, PrimaryButton, Screen, Subtitle, Title } from '../../components/ui';
import { createSupportTicket } from '../../lib/support';
import { customAlert } from '../../components/custom-alert';
import { useAuth } from '../../providers/auth-provider';

export default function MechanicSupport() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    if (!user || !subject.trim() || !message.trim()) {
      customAlert.warning('Missing fields', 'Subject and message required.');
      return;
    }
    const { error } = await createSupportTicket({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (error) customAlert.error('Failed', error);
    else {
      customAlert.success('Sent', 'Support ticket created.');
      setSubject('');
      setMessage('');
    }
  }

  return (
    <Screen>
      <AdminSupportCard role="mechanic" style={{ marginBottom: 14 }} />
      <Title>Support</Title>
      <Subtitle>Contact AutoCares support.</Subtitle>
      <Label>Subject</Label>
      <Field value={subject} onChangeText={setSubject} />
      <Label>Message</Label>
      <Field value={message} onChangeText={setMessage} multiline style={{ minHeight: 100 }} />
      <PrimaryButton label="Send" onPress={submit} />
    </Screen>
  );
}
