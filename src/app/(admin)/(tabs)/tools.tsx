import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import AutoCaresLogo from '../../../components/autocares-logo';
import { Card, OutlineButton, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';

const tools = [
  ['categories', 'Service categories', 'Edit categories available to customers'],
  ['support', 'Complaints & support', 'Review and resolve customer support tickets'],
  ['reviews', 'Review moderation', 'Remove inappropriate reviews'],
  ['announcements', 'Announcements', 'Send notifications to users'],
  ['activity', 'Activity logs', 'Review administrator actions'],
  ['profile', 'Admin profile', 'Account details and sign out'],
] as const;

export default function AdminTools() {
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AutoCaresLogo size="header" style={{ marginBottom: 12, alignSelf: 'flex-start' }} />
        <Title>Administrator tools</Title>
        <Subtitle>Manage platform services and communications.</Subtitle>
        {tools.map(([route, title, description]) => (
          <Card key={route}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 5 }}>{description}</Text>
            <OutlineButton
              label={`Open ${title}`}
              onPress={() => router.push(`/(admin)/(tabs)/${route}`)}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
