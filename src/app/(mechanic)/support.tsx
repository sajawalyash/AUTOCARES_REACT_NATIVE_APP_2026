import { useState } from 'react';
import { Alert } from 'react-native';

import { Field, Label, PrimaryButton, Screen, Subtitle, Title } from '../../components/ui';
import { createSupportTicket } from '../../lib/support';
import { useAuth } from '../../providers/auth-provider';

export default function MechanicSupport() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    if (!user || !subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Subject and message required.');
      return;
    }
    const { error } = await createSupportTicket({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (error) Alert.alert('Failed', error);
    else {
      Alert.alert('Sent', 'Support ticket created.');
      setSubject('');
      setMessage('');
    }
  }

  return (
    <Screen>
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
