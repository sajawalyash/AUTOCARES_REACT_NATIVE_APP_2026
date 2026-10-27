import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import AdminSubscreenHeader from '../../../components/admin-subscreen-header';
import { Card, EmptyState, ErrorText, LoadingState, PrimaryButton, Screen } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listServiceCategories, recordAdminActivity, updateServiceCategory, upsertServiceCategory } from '../../../lib/admin';
import type { ProblemType, ServiceCategory } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const DEFAULT_CATEGORIES: { id: ProblemType; label: string; description: string }[] = [
  { id: 'flat_tire', label: 'Flat tire', description: 'Flat or damaged tire assistance and replacement' },
  { id: 'dead_battery', label: 'Dead battery', description: 'Jump-start and vehicle battery diagnostic services' },
  { id: 'engine_issue', label: 'Engine issue', description: 'Engine troubleshooting, diagnostics, and mechanical repair' },
  { id: 'overheating', label: 'Overheating', description: 'Radiator, coolant, and vehicle overheating assistance' },
  { id: 'towing', label: 'Towing service', description: 'Emergency roadside towing to nearest mechanic or destination' },
  { id: 'sos', label: 'Emergency SOS', description: 'Critical priority roadside emergency response' },
  { id: 'other', label: 'General assistance', description: 'Other non-standard mechanical inspection and roadside help' },
];

function CategoryItemCard({
  category,
  onSave,
}: {
  category: ServiceCategory;
  onSave: (
    id: ServiceCategory['id'],
    patch: { label: string; description: string; is_active: boolean }
  ) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(category.label);
  const [description, setDescription] = useState(category.description);
  const [isActive, setIsActive] = useState(category.is_active);
  const [saving, setSaving] = useState(false);

  const isDirty =
    label.trim() !== category.label ||
    description.trim() !== category.description ||
    isActive !== category.is_active;

  async function handleSave() {
    if (!label.trim()) {
      Alert.alert('Category name required', 'Please enter a non-empty category name.');
      return;
    }
    setSaving(true);
    const success = await onSave(category.id, {
      label: label.trim(),
      description: description.trim(),
      is_active: isActive,
    });
    setSaving(false);
    if (!success) {
      // Revert if failed
      setLabel(category.label);
      setDescription(category.description);
      setIsActive(category.is_active);
    }
  }

  function handleReset() {
    setLabel(category.label);
    setDescription(category.description);
    setIsActive(category.is_active);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.keyBadge}>
          <Text style={styles.keyText}>{category.id}</Text>
        </View>

        <View style={styles.statusToggleRow}>
          <Text style={[styles.statusLabel, { color: isActive ? '#15803D' : theme.colors.muted }]}>
            {isActive ? 'Active' : 'Disabled'}
          </Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={isActive ? theme.colors.primary : theme.colors.surfaceSubtle}
          />
        </View>
      </View>

      <Text style={styles.inputLabel}>Display Name</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Category name"
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
      />

      <Text style={styles.inputLabel}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description for customers"
        placeholderTextColor={theme.colors.muted}
        multiline
        numberOfLines={2}
        style={[styles.input, styles.multilineInput]}
      />

      {isDirty ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleReset}
            disabled={saving}
            style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.7 }]}>
            <Text style={styles.resetButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              saving && { opacity: 0.6 },
              pressed && { opacity: 0.8 },
            ]}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

export default function AdminCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listServiceCategories(true);
    setCategories(result.categories);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSaveCategory(
    id: ServiceCategory['id'],
    patch: { label: string; description: string; is_active: boolean }
  ): Promise<boolean> {
    const { error: saveError } = await updateServiceCategory(id, patch);
    if (saveError) {
      Alert.alert('Could not save category', saveError);
      return false;
    }

    // Non-blocking activity logging
    if (user) {
      recordAdminActivity({
        actor_id: user.id,
        action: 'updated',
        entity_type: 'service_category',
        entity_id: id,
        details: { label: patch.label, is_active: patch.is_active },
      }).catch(() => {});
    }

    Alert.alert('Saved', `Category "${patch.label}" updated successfully.`);
    load();
    return true;
  }

  async function handleRestoreMissing() {
    const existingIds = new Set(categories.map((c) => c.id));
    const missing = DEFAULT_CATEGORIES.filter((c) => !existingIds.has(c.id));

    if (missing.length === 0) {
      Alert.alert('All standard categories present', 'All 7 standard roadside service categories already exist.');
      return;
    }

    setLoading(true);
    for (const item of missing) {
      await upsertServiceCategory({
        id: item.id,
        label: item.label,
        description: item.description,
        is_active: true,
      });
    }

    if (user) {
      recordAdminActivity({
        actor_id: user.id,
        action: 'restored default categories',
        entity_type: 'service_category',
        details: { restored_count: missing.length },
      }).catch(() => {});
    }

    Alert.alert('Restored', `Added ${missing.length} missing standard categories.`);
    load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading service categories…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }>
        <AdminSubscreenHeader
          title="Service categories"
          subtitle="Configure customer-facing labels and active status for roadside services."
          rightAction={
            <Pressable
              onPress={handleRestoreMissing}
              style={({ pressed }) => [styles.restoreButton, pressed && { opacity: 0.7 }]}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.restoreText}>Restore defaults</Text>
            </Pressable>
          }
        />

        <ErrorText message={error} />

        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState message="No service categories found in the database." />
            <PrimaryButton label="Restore 7 standard categories" onPress={handleRestoreMissing} />
          </View>
        ) : null}

        {categories.map((category) => (
          <CategoryItemCard
            key={category.id}
            category={category}
            onSave={handleSaveCategory}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  keyBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keyText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    color: theme.colors.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
  },
  resetButtonText: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyContainer: {
    paddingVertical: 20,
    gap: 12,
  },
});
