import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';

import {
  Field,
  Label,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { updateProfile } from '../../../lib/profiles';
import { useAuth } from '../../../providers/auth-provider';

export default function CustomerProfile() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: fullName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Save failed', error);
      return;
    }
    await refreshProfile();
    Alert.alert('Saved', 'Profile updated.');
  }

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Profile settings</Title>
        <Subtitle>{user?.email}</Subtitle>

        <Label>Full name</Label>
        <Field value={fullName} onChangeText={setFullName} />
        <Label>Phone</Label>
        <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <PrimaryButton label={saving ? 'Saving…' : 'Save profile'} onPress={save} disabled={saving} />
        <OutlineButton label="My vehicles" onPress={() => router.push('/(customer)/vehicles')} />
        <OutlineButton label="Notifications" onPress={() => router.push('/(customer)/notifications')} />
        <OutlineButton label="Contact support" onPress={() => router.push('/(customer)/support')} />
        <OutlineButton label="Help" onPress={() => router.push('/(customer)/help')} />
        <PrimaryButton label="Sign out" onPress={logout} danger />
      </ScrollView>
    </Screen>
  );
}
