import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listServiceCategories, recordAdminActivity, updateServiceCategory } from '../../../lib/admin';
import type { ServiceCategory } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function AdminCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listServiceCategories(true);
    setCategories(result.categories);
    setError(result.error);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(category: ServiceCategory) {
    if (!category.label.trim()) {
      Alert.alert('Category name required', 'Enter a category name before saving.');
      return;
    }
    const { error: saveError } = await updateServiceCategory(category.id, {
      label: category.label.trim(),
      description: category.description.trim(),
      is_active: category.is_active,
    });
    if (saveError) {
      Alert.alert('Could not save category', saveError);
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: 'updated',
        entity_type: 'service_category',
        entity_id: category.id,
        details: { label: category.label.trim(), is_active: category.is_active },
      });
      if (log.error) Alert.alert('Category saved, but activity log failed', log.error);
    }
    load();
  }

  if (loading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <ScrollView>
        <Title>Service categories</Title>
        <Subtitle>Edit the customer-facing labels and availability of service types.</Subtitle>
        <ErrorText message={error} />
        {categories.length === 0 ? <EmptyState message="No service categories found." /> : null}
        {categories.map((category) => (
          <Card key={category.id}>
            <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>Category key: {category.id}</Text>
            <Field
              value={category.label}
              onChangeText={(label) => setCategories((items) =>
                items.map((item) => item.id === category.id ? { ...item, label } : item)
              )}
              placeholder="Category name"
            />
            <Field
              value={category.description}
              onChangeText={(description) => setCategories((items) =>
                items.map((item) => item.id === category.id ? { ...item, description } : item)
              )}
              placeholder="Description"
              multiline
            />
            <PrimaryButton
              label={category.is_active ? 'Deactivate category' : 'Activate category'}
              onPress={() => setCategories((items) =>
                items.map((item) => item.id === category.id ? { ...item, is_active: !item.is_active } : item)
              )}
            />
            <PrimaryButton label="Save category" onPress={() => save(category)} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
