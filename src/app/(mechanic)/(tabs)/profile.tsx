import { Avatar } from '../../../components/avatar';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

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
import { getCurrentCoords } from '../../../lib/location';
import { updateProfile } from '../../../lib/profiles';
import { getMechanicProfile, updateMechanicProfile } from '../../../lib/mechanics';
import { useAuth } from '../../../providers/auth-provider';

export default function MechanicProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  async function handleAvatarPicked(uri: string) {
    if (!user) return;
    const { error } = await updateProfile(user.id, { avatar_url: uri });
    if (error) {
      Alert.alert('Upload Failed', error);
      return;
    }
    await refreshProfile();
    Alert.alert('Success', 'Mechanic photo updated successfully!');
  }
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
    else Alert.alert('Saved', 'Mechanic profile and live location updated.');
  }

  const isApproved = verification === 'approved';

  return (
    <Screen safeBottom={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Title>Mechanic Profile</Title>
        <Subtitle>{`${profile?.full_name ?? 'Technician'} · ${user?.email ?? ''}`}</Subtitle>

        {/* Mechanic Avatar Card */}
        <Card style={styles.userCard}>
          <Avatar
            url={profile?.avatar_url}
            name={workshop || profile?.full_name || 'Mechanic'}
            size={72}
            editable={true}
            onImagePicked={handleAvatarPicked}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{workshop || profile?.full_name || 'Mechanic'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'MECHANIC'}</Text>
            </View>
          </View>
        </Card>

        {/* Verification Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Verification Status</Text>
              <Text style={styles.statusSub}>
                {isApproved
                  ? 'Your profile is approved and active.'
                  : 'Pending admin review before accepting new jobs.'}
              </Text>
            </View>
            <View style={[styles.badge, isApproved ? styles.approvedBadge : styles.pendingBadge]}>
              <Text style={[styles.badgeText, isApproved ? styles.approvedText : styles.pendingText]}>
                {verification.toUpperCase()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Available Toggle */}
        <Card style={styles.toggleCard}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.toggleTitle}>Available for Jobs</Text>
            <Text style={styles.toggleSub}>Appear live on customer map & receive requests</Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={available ? '#FFFFFF' : '#FFFFFF'}
          />
        </Card>

        {/* Profile Inputs */}
        <Card>
          <Label>Workshop / Business Name</Label>
          <Field value={workshop} onChangeText={setWorkshop} placeholder="e.g. Master Auto Works" />

          <Label>Specialties (comma separated)</Label>
          <Field
            value={specialties}
            onChangeText={setSpecialties}
            placeholder="battery, tires, brakes, engine, towing"
          />

          <Label>Years of Experience</Label>
          <Field
            value={experience}
            onChangeText={setExperience}
            keyboardType="number-pad"
            placeholder="e.g. 5"
          />

          <Label>Service Radius (km)</Label>
          <Field
            value={radius}
            onChangeText={setRadius}
            keyboardType="decimal-pad"
            placeholder="15"
          />

          <Label>Working Hours</Label>
          <Field value={hours} onChangeText={setHours} placeholder="09:00 - 18:00" />

          <Label>About You / Bio</Label>
          <Field
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Brief description of your expertise and equipment"
            style={{ minHeight: 70 }}
          />

          <PrimaryButton
            label={saving ? 'Updating Profile…' : 'Save Profile & GPS Location'}
            onPress={save}
            disabled={saving}
          />
        </Card>

        <OutlineButton
          label="Reviews & Performance"
          onPress={() => router.push('/(mechanic)/reviews')}
        />
        <OutlineButton label="Contact Support" onPress={() => router.push('/(mechanic)/support')} />

        <PrimaryButton
          label="Sign Out"
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

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  userEmail: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
  },
  roleText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    paddingBottom: 36,
  },
  statusCard: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statusSub: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
    maxWidth: 220,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  approvedBadge: {
    backgroundColor: theme.colors.successLight,
    borderColor: '#BBF7D0',
  },
  approvedText: {
    color: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
  },
  pendingText: {
    color: theme.colors.yellowText,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  toggleSub: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
