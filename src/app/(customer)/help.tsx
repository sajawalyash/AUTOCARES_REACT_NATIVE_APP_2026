import { Text } from 'react-native';

import { Card, Screen, Subtitle, Title } from '../../components/ui';
import { theme } from '../../constants/autocares-theme';

const topics = [
  {
    title: 'Requesting help',
    body: 'Open Request help, pick a problem, share location, and submit. Track status from Home or History.',
  },
  {
    title: 'Finding mechanics',
    body: 'Mechanics tab uses your GPS to show verified nearby technicians with distance and ETA.',
  },
  {
    title: 'AI assistant',
    body: 'Describe symptoms or enter an OBD-II code. Guidance is informational—not a substitute for a technician.',
  },
  {
    title: 'SOS',
    body: 'Use SOS for urgent roadside situations. Call local emergency numbers if you are in danger.',
  },
];

export default function HelpScreen() {
  return (
    <Screen>
      <Title>Help</Title>
      <Subtitle>Quick answers for AutoCares customers.</Subtitle>
      {topics.map((t) => (
        <Card key={t.title}>
          <Text style={{ fontWeight: '800', color: theme.colors.text }}>{t.title}</Text>
          <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 20 }}>{t.body}</Text>
        </Card>
      ))}
    </Screen>
  );
}
