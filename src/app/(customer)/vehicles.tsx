import { useCallback, useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  Label,
  LoadingState,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import { vehicleLabel, type Vehicle, type VehicleDiagnostic } from '../../lib/types';
import {
  addDiagnostic,
  createVehicle,
  deleteVehicle,
  listDiagnostics,
  listVehicles,
} from '../../lib/vehicles';
import { useAuth } from '../../providers/auth-provider';

export default function VehiclesScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [diagnostics, setDiagnostics] = useState<VehicleDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [registration, setRegistration] = useState('');
  const [diagCode, setDiagCode] = useState('');
  const [diagDesc, setDiagDesc] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { vehicles: list, error: err } = await listVehicles(user.id);
    setError(err);
    setVehicles(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function openVehicle(v: Vehicle) {
    setSelected(v);
    const { diagnostics: d } = await listDiagnostics(v.id);
    setDiagnostics(d);
  }

  async function addVehicle() {
    if (!user || !make.trim() || !model.trim()) {
      Alert.alert('Missing fields', 'Make and model are required.');
      return;
    }
    const { error: createError } = await createVehicle({
      customer_id: user.id,
      vehicle_type: null,
      make: make.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      registration_number: registration.trim() || null,
      color: null,
      notes: null,
    });
    if (createError) {
      Alert.alert('Error', createError);
      return;
    }
    setMake('');
    setModel('');
    setYear('');
    setRegistration('');
    load();
  }

  async function removeVehicle(id: string) {
    const { error: delError } = await deleteVehicle(id);
    if (delError) Alert.alert('Error', delError);
    setSelected(null);
    load();
  }

  async function saveDiagnostic() {
    if (!selected || !diagDesc.trim()) return;
    const { error: addError } = await addDiagnostic({
      vehicle_id: selected.id,
      code: diagCode.trim() || undefined,
      description: diagDesc.trim(),
    });
    if (addError) {
      Alert.alert('Error', addError);
      return;
    }
    setDiagCode('');
    setDiagDesc('');
    openVehicle(selected);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>My vehicles</Title>
      <Subtitle>Save make, model, year, registration, and diagnostics.</Subtitle>
      <ErrorText message={error} />

      <Card>
        <Label>Add vehicle</Label>
        <Field value={make} onChangeText={setMake} placeholder="Make" />
        <Field value={model} onChangeText={setModel} placeholder="Model" />
        <Field value={year} onChangeText={setYear} placeholder="Year" keyboardType="number-pad" />
        <Field
          value={registration}
          onChangeText={setRegistration}
          placeholder="Registration number"
        />
        <PrimaryButton label="Save vehicle" onPress={addVehicle} />
      </Card>

      {vehicles.length === 0 ? (
        <EmptyState message="No vehicles yet." />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            selected ? (
              <Card>
                <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                  Diagnostics · {vehicleLabel(selected)}
                </Text>
                {diagnostics.map((d) => (
                  <Text key={d.id} style={{ color: theme.colors.muted, marginTop: 6 }}>
                    {d.code ? `[${d.code}] ` : ''}
                    {d.description}
                  </Text>
                ))}
                <Field value={diagCode} onChangeText={setDiagCode} placeholder="Code (optional)" />
                <Field value={diagDesc} onChangeText={setDiagDesc} placeholder="Description" />
                <PrimaryButton label="Add diagnostic" onPress={saveDiagnostic} />
                <OutlineButton label="Close" onPress={() => setSelected(null)} />
              </Card>
            ) : null
          }
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {item.year ? `${item.year} ` : ''}
                {vehicleLabel(item)}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {item.registration_number || 'No registration'}
              </Text>
              <PrimaryButton label="Diagnostics" onPress={() => openVehicle(item)} />
              <OutlineButton label="Delete" onPress={() => removeVehicle(item.id)} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
