import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminSubscreenHeader from '@/components/admin-subscreen-header';
import { Card, Screen } from '@/components/ui';
import { theme } from '@/constants/autocares-theme';
import { useAuth } from '@/providers/auth-provider';

export default function AdminProfile() {
  const { user, profile, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out of the administrator panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  const initials = (profile?.full_name || 'Admin')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AdminSubscreenHeader
          title="Administrator profile"
          subtitle="Platform management credentials and fast access links."
        />

        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile?.full_name || 'System Administrator'}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#15803D" />
                <Text style={styles.roleBadgeText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.emailText}>{user?.email || 'admin@autocares.com'}</Text>
            <Text style={styles.metaText}>User ID: {user?.id?.slice(0, 16)}…</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Platform Navigation</Text>

        <View style={styles.navGrid}>
          <Pressable
            onPress={() => router.push('/(admin)/(tabs)/users')}
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}>
            <View style={styles.navIconBox}>
              <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>User Management</Text>
              <Text style={styles.navDesc}>Inspect all accounts and roles</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(admin)/(tabs)/verify')}
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}>
            <View style={styles.navIconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Verification Queue</Text>
              <Text style={styles.navDesc}>Approve or reject mechanics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(admin)/(tabs)/oversight')}
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}>
            <View style={styles.navIconBox}>
              <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Service Oversight</Text>
              <Text style={styles.navDesc}>Live requests and status tracking</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(admin)/(tabs)/analytics')}
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}>
            <View style={styles.navIconBox}>
              <Ionicons name="bar-chart-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Analytics & Reports</Text>
              <Text style={styles.navDesc}>Performance metrics and charts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutText}>Sign out of Admin</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  emailText: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  navGrid: {
    gap: 8,
    marginBottom: 24,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 12,
    ...theme.shadows.card,
  },
  navCardPressed: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  navIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  navDesc: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 32,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
