import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AutoCaresLogo from '../../../components/autocares-logo';
import { Badge, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { getAdminToolsSummary } from '../../../lib/admin';

type ToolItem = {
  route: 'categories' | 'support' | 'reviews' | 'announcements' | 'activity' | 'profile';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  getBadge?: (summary: {
    activeCategoriesCount: number;
    openTicketsCount: number;
    totalRatingsCount: number;
  }) => { label: string; variant: 'blue' | 'yellow' | 'orange' | 'green' | 'muted' } | null;
};

const toolsList: ToolItem[] = [
  {
    route: 'categories',
    title: 'Service categories',
    description: 'Edit service types, active availability, and descriptions',
    icon: 'grid-outline',
    getBadge: (s) => ({
      label: `${s.activeCategoriesCount} Active`,
      variant: 'green',
    }),
  },
  {
    route: 'support',
    title: 'Complaints & support',
    description: 'Review and resolve customer support tickets',
    icon: 'chatbubble-ellipses-outline',
    getBadge: (s) =>
      s.openTicketsCount > 0
        ? { label: `${s.openTicketsCount} Pending`, variant: 'yellow' }
        : { label: 'All resolved', variant: 'green' },
  },
  {
    route: 'reviews',
    title: 'Review moderation',
    description: 'Inspect user ratings and moderate inappropriate reviews',
    icon: 'star-half-outline',
    getBadge: (s) => ({
      label: `${s.totalRatingsCount} Reviews`,
      variant: 'blue',
    }),
  },
  {
    route: 'announcements',
    title: 'Broadcast announcements',
    description: 'Send broadcast push/in-app notifications to users or mechanics',
    icon: 'megaphone-outline',
  },
  {
    route: 'activity',
    title: 'Activity audit logs',
    description: 'Audit history of administrator actions and modifications',
    icon: 'time-outline',
  },
  {
    route: 'profile',
    title: 'Admin profile',
    description: 'Account settings, permissions overview, and sign out',
    icon: 'person-circle-outline',
  },
];

export default function AdminTools() {
  const [summary, setSummary] = useState<{
    activeCategoriesCount: number;
    totalCategoriesCount: number;
    openTicketsCount: number;
    totalTicketsCount: number;
    totalRatingsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getAdminToolsSummary();
      setSummary(data);
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              loadSummary();
            }}
            tintColor={theme.colors.primary}
          />
        }>
        <AutoCaresLogo size="header" style={{ marginBottom: 12, alignSelf: 'flex-start' }} />
        <Title>Administrator tools</Title>
        <Subtitle>Manage platform operations, user support, and platform policies.</Subtitle>

        {summary ? (
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{summary.activeCategoriesCount}</Text>
              <Text style={styles.metricLabel}>Active Services</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, summary.openTicketsCount > 0 && { color: theme.colors.orangeText }]}>
                {summary.openTicketsCount}
              </Text>
              <Text style={styles.metricLabel}>Open Tickets</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{summary.totalRatingsCount}</Text>
              <Text style={styles.metricLabel}>Total Reviews</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.toolsList}>
          {toolsList.map((tool) => {
            const badge = summary && tool.getBadge ? tool.getBadge(summary) : null;
            return (
              <Pressable
                key={tool.route}
                onPress={() => router.push(`/(admin)/${tool.route}`)}
                style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={tool.title}>
                <View style={styles.iconCircle}>
                  <Ionicons name={tool.icon} size={22} color={theme.colors.primary} />
                </View>

                <View style={styles.toolContent}>
                  <View style={styles.toolTitleRow}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    {badge ? <Badge label={badge.label} variant={badge.variant} /> : null}
                  </View>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  toolsList: {
    gap: 10,
    marginBottom: 24,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
    ...theme.shadows.card,
  },
  cardPressed: {
    backgroundColor: theme.colors.surfaceSubtle,
    transform: [{ scale: 0.995 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolContent: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 3,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.1,
  },
  toolDescription: {
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 16,
  },
});
