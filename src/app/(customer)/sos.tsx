import { useState } from 'react';
import { Alert, Linking, Text } from 'react-native';

import {
  ErrorText,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
  Card,
} from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import { getCurrentCoords } from '../../lib/location';
import { replace } from '../../lib/nav';
import { createServiceRequest } from '../../lib/requests';
import { useAuth } from '../../providers/auth-provider';

export default function SosScreen() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendSos() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const loc = await getCurrentCoords();
    if (!loc.coords) {
      setLoading(false);
      setError(loc.error ?? 'Location required for SOS');
      return;
    }
    const { request, error: createError } = await createServiceRequest({
      customer_id: user.id,
      problem_type: 'sos',
      description: 'Emergency SOS roadside request',
      customer_lat: loc.coords.latitude,
      customer_lng: loc.coords.longitude,
      is_sos: true,
    });
    setLoading(false);
    if (createError || !request) {
      Alert.alert('SOS failed', createError ?? 'Unknown error');
      return;
    }
    replace(`/(customer)/tracking/${request.id}`);
  }

  return (
    <Screen>
      <Title>Emergency SOS</Title>
      <Subtitle>
        Share your location and create an urgent roadside request. Call local emergency services
        if you are in immediate danger.
      </Subtitle>
      <ErrorText message={error} />

      <Card>
        <Text style={{ color: theme.colors.danger, fontWeight: '800', marginBottom: 8 }}>
          Use SOS for urgent roadside situations
        </Text>
        <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
          This notifies available verified mechanics with your GPS coordinates.
        </Text>
        <Text style={{ color: theme.colors.blue, fontWeight: '700', marginTop: 8 }}>
          Fixed Diagnosis Fee: Rs. 300 PKR (Pay directly to mechanic in cash).
        </Text>
      </Card>

      <PrimaryButton
        label={loading ? 'Sending SOS…' : 'Send SOS request'}
        onPress={sendSos}
        disabled={loading}
        danger
      />
      <PrimaryButton
        label="Call emergency (local)"
        onPress={() => Linking.openURL('tel:911')}
        danger
      />
    </Screen>
  );
}
