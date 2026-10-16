import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Field,
  Label,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
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
    Alert.alert('Saved', 'Profile updated successfully.');
  }

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Title>Account Profile</Title>
        <Subtitle>Manage personal details and roadside preferences</Subtitle>

        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name || 'Driver'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>CUSTOMER</Text>
            </View>
          </View>
        </Card>

        {/* Edit Details */}
        <Card>
          <Label>Full Name</Label>
          <Field value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />

          <Label>Phone Number</Label>
          <Field
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="03001234567"
          />

          <PrimaryButton
            label={saving ? 'Saving Changes…' : 'Save Profile'}
            onPress={save}
            disabled={saving}
          />
        </Card>

        {/* Account Shortcuts */}
        <Card style={styles.linksCard}>
          <Text style={styles.linksTitle}>Quick Shortcuts</Text>
          <OutlineButton label="My Vehicles & Garage" onPress={() => router.push('/(customer)/vehicles')} />
          <OutlineButton label="Notifications & Alerts" onPress={() => router.push('/(customer)/notifications')} />
          <OutlineButton label="OBD-II Bluetooth Diagnostics" onPress={() => router.push('/(customer)/obd-ii')} />
          <OutlineButton label="Help Center & FAQs" onPress={() => router.push('/(customer)/help')} />
          <OutlineButton label="Contact Support" onPress={() => router.push('/(customer)/support')} />
        </Card>

        <PrimaryButton label="Sign Out" onPress={logout} danger />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primarySubtle,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  roleText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  linksCard: {
    marginTop: 4,
    marginBottom: 16,
    gap: 4,
  },
  linksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
});
