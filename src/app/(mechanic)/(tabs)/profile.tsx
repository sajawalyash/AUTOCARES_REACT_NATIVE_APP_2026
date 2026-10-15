import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text } from 'react-native';

import {
  Field,
  Label,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
  Card,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { getCurrentCoords } from '../../../lib/location';
import { getMechanicProfile, updateMechanicProfile } from '../../../lib/mechanics';
import { useAuth } from '../../../providers/auth-provider';

export default function MechanicProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const [workshop, setWorkshop] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [experience, setExperience] = useState('0');
  const [radius, setRadius] = useState('15');
  const [hours, setHours] = useState('09:00-18:00');
  const [bio, setBio] = useState('');
  const [available, setAvailable] = useState(true);
  const [verification, setVerification] = useState('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { mechanic } = await getMechanicProfile(user.id);
      if (!mechanic) return;
      setWorkshop(mechanic.workshop_name ?? '');
      setSpecialties((mechanic.specialties ?? []).join(', '));
      setExperience(String(mechanic.experience_years ?? 0));
      setRadius(String(mechanic.service_radius_km ?? 15));
      setHours(mechanic.working_hours ?? '09:00-18:00');
      setBio(mechanic.bio ?? '');
      setAvailable(mechanic.is_available);
      setVerification(mechanic.verification_status);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const loc = await getCurrentCoords();
    const { error } = await updateMechanicProfile(user.id, {
      workshop_name: workshop.trim(),
      specialties: specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      experience_years: Number(experience) || 0,
      service_radius_km: Number(radius) || 15,
      working_hours: hours,
      bio: bio.trim(),
      is_available: available,
      latitude: loc.coords?.latitude ?? undefined,
      longitude: loc.coords?.longitude ?? undefined,
    });
    setSaving(false);
    if (error) Alert.alert('Save failed', error);
    else Alert.alert('Saved', 'Mechanic profile updated.');
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Mechanic profile</Title>
        <Subtitle>{`${profile?.full_name ?? 'Technician'} · ${user?.email ?? ''}`}</Subtitle>

        <Card>
          <Text style={{ fontWeight: '800', color: theme.colors.text }}>
            Verification: {verification}
          </Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
            Admins approve applications before you can accept jobs.
          </Text>
        </Card>

        <Label>Workshop name</Label>
        <Field value={workshop} onChangeText={setWorkshop} />
        <Label>Specialties (comma separated)</Label>
        <Field value={specialties} onChangeText={setSpecialties} placeholder="battery, tires, towing" />
        <Label>Experience (years)</Label>
        <Field value={experience} onChangeText={setExperience} keyboardType="number-pad" />
        <Label>Service radius (km)</Label>
        <Field value={radius} onChangeText={setRadius} keyboardType="decimal-pad" />
        <Label>Working hours</Label>
        <Field value={hours} onChangeText={setHours} />
        <Label>Bio</Label>
        <Field value={bio} onChangeText={setBio} multiline style={{ minHeight: 70 }} />

        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', color: theme.colors.text }}>Available for jobs</Text>
          <Switch value={available} onValueChange={setAvailable} />
        </Card>

        <PrimaryButton label={saving ? 'Saving…' : 'Save profile + location'} onPress={save} disabled={saving} />
        <OutlineButton label="Reviews & performance" onPress={() => router.push('/(mechanic)/reviews')} />
        <OutlineButton label="Support" onPress={() => router.push('/(mechanic)/support')} />
        <PrimaryButton
          label="Sign out"
          danger
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
