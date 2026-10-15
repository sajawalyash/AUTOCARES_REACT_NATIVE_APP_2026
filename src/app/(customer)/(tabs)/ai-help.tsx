import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Card,
  ErrorText,
  Field,
  Label,
  PrimaryButton,
  OutlineButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import {
  getVehicleGuidance,
  type AiGuidance,
  type AssistantMessage,
  type ObdContext,
} from '../../../lib/ai';
import { listServiceCategories } from '../../../lib/admin';
import {
  PROBLEM_LABELS,
  type ProblemType,
  type ServiceCategory,
  type VehicleType,
} from '../../../lib/types';

const vehicleTypes: VehicleType[] = ['Car', 'Bike', 'Scooter', 'Van'];
const fuelTypes = ['petrol', 'diesel', 'hybrid', 'electric', 'other'] as const;
const quickSymptoms = [
  'My vehicle will not start',
  'The engine is overheating',
  'I hear an unusual noise',
  'A warning light is on',
];

export default function AiHelpScreen() {
  const params = useLocalSearchParams<{ diagnosticData?: string }>();
  const diagnosticData = Array.isArray(params.diagnosticData)
    ? params.diagnosticData[0]
    : params.diagnosticData;
  return <AiHelpSession key={diagnosticData ?? 'no-obd-data'} diagnosticData={diagnosticData} />;
}

function AiHelpSession({ diagnosticData }: { diagnosticData?: string }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [vehicleType, setVehicleType] = useState<VehicleType>('Car');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [fuelType, setFuelType] = useState<(typeof fuelTypes)[number] | null>(null);
  const [problemType, setProblemType] = useState<ProblemType>('other');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [diagnostics, setDiagnostics] = useState<ObdContext | null>(() =>
    parseObdContext(diagnosticData)
  );
  const [draft, setDraft] = useState('');
  const [guidance, setGuidance] = useState<AiGuidance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryText, setRetryText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listServiceCategories()
      .then((result) => {
        if (!active) return;
        setCategories(result.categories);
        if (result.error) setError(`Service categories could not be loaded: ${result.error}`);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? `Service categories could not be loaded: ${loadError.message}`
            : 'Service categories could not be loaded.'
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function sendMessage(text: string, retry = false) {
    const trimmed = text.trim();
    if (!trimmed || loading || (retryText && !retry)) return;
    if (year && (!/^\d{4}$/.test(year) || Number(year) < 1950 || Number(year) > new Date().getFullYear() + 1)) {
      setError('Enter a valid four-digit vehicle year.');
      return;
    }
    const nextMessages = retry
      ? messages
      : [...messages, { role: 'user' as const, text: trimmed }];
    if (!retry) {
      setMessages(nextMessages);
      setRetryText(trimmed);
      setDraft('');
    }
    setError(null);
    setLoading(true);
    try {
      const result = await getVehicleGuidance({
        messages: nextMessages.slice(-12).filter((message, index, recent) =>
          !(index === 0 && message.role === 'model' && recent.length > 1)
        ),
        vehicle: {
          vehicle_type: vehicleType,
          make: make.trim(),
          model: model.trim(),
          year: year ? Number(year) : null,
          fuel_type: fuelType,
        },
        problemType,
        diagnostics,
      });
      if (result.error || !result.guidance) {
        setError(result.error ?? 'The assistant did not return guidance.');
        return;
      }
      setGuidance(result.guidance);
      setRetryText(null);
      setMessages((current) => [
        ...current,
        { role: 'model', text: result.guidance!.summary },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the vehicle assistant.');
    } finally {
      setLoading(false);
    }
  }

  function startNewDiagnosis() {
    setMessages([]);
    setGuidance(null);
    setError(null);
    setDraft('');
    setRetryText(null);
    setDiagnostics(null);
  }

  const activeCategories = categories.length > 0
    ? categories
    : (Object.entries(PROBLEM_LABELS) as [ProblemType, string][]).map(([id, label]) => ({
        id,
        label,
        description: '',
        is_active: true,
        created_at: '',
        updated_at: '',
      }));

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Title>AI Vehicle Assistant</Title>
        <Subtitle>
          Focused troubleshooting for your vehicle. Guidance is informational, not a confirmed diagnosis.
        </Subtitle>

        <Card style={styles.safetyBanner}>
          <Text style={styles.safety}>
            If the brakes or steering fail, fuel leaks, smoke, a burning smell, or severe overheating occur,
            stop safely and do not continue driving.
          </Text>
        </Card>

        <Label>Vehicle type</Label>
        <View style={styles.chips}>
          {vehicleTypes.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: vehicleType === type }}
              style={[styles.chip, vehicleType === type && styles.chipSelected]}
              onPress={() => setVehicleType(type)}>
              <Text style={styles.chipText}>{type}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Field value={make} onChangeText={setMake} placeholder="Make (optional)" style={styles.halfField} />
          <Field value={model} onChangeText={setModel} placeholder="Model (optional)" style={styles.halfField} />
        </View>
        <Field
          value={year}
          onChangeText={(value) => setYear(value.replace(/\D/g, '').slice(0, 4))}
          placeholder="Year (optional)"
          keyboardType="number-pad"
          maxLength={4}
        />
        <Label>Fuel type (optional)</Label>
        <View style={styles.chips}>
          {fuelTypes.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: fuelType === type }}
              style={[styles.chip, fuelType === type && styles.chipSelected]}
              onPress={() => setFuelType((current) => current === type ? null : type)}>
              <Text style={styles.chipText}>{type[0].toUpperCase() + type.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <Label>Service category</Label>
        <View style={styles.chips}>
          {activeCategories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: problemType === category.id }}
              style={[styles.chip, problemType === category.id && styles.chipSelected]}
              onPress={() => setProblemType(category.id)}>
              <Text style={styles.chipText}>{category.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.outlineAction}
            onPress={() => router.push('/(customer)/obd-ii')}>
            <Text style={styles.actionText}>OBD-II Diagnostics</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.outlineAction} onPress={startNewDiagnosis}>
            <Text style={styles.actionText}>New diagnosis</Text>
          </Pressable>
        </View>
        {diagnostics && (
          <Text style={styles.diagnosticLabel}>
            Connected-adapter data attached · captured {new Date(diagnostics.captured_at).toLocaleTimeString()}
          </Text>
        )}

        <View style={styles.chat}>
          {messages.length === 0 && (
            <View style={[styles.message, styles.assistantMessage]}>
              <Text style={styles.messageText}>
                Tell me what happened, and I will help you with safe, step-by-step vehicle troubleshooting.
              </Text>
            </View>
          )}
          {messages.map((message, index) => (
            <View
              key={`${index}-${message.role}`}
              style={[
                styles.message,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' && styles.userMessageText,
                ]}>
                {message.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.message, styles.assistantMessage]}>
              <Text style={styles.messageText}>Checking safe troubleshooting steps…</Text>
            </View>
          )}
        </View>

        {messages.length === 0 && (
          <>
            <Label>Common problems</Label>
            <View style={styles.chips}>
              {quickSymptoms.map((symptom) => (
                <Pressable
                  key={symptom}
                  disabled={loading}
                  style={styles.quickChip}
                  onPress={() => void sendMessage(symptom)}>
                  <Text style={styles.quickText}>{symptom}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <ErrorText message={error} />
        <Field
          value={draft}
          onChangeText={setDraft}
          placeholder="Describe what happened or answer the question"
          multiline
          maxLength={1500}
          style={styles.messageInput}
          editable={!loading && !retryText}
          accessibilityLabel="Describe the vehicle problem"
        />
        <PrimaryButton
          label={loading ? 'Thinking…' : 'Send'}
          onPress={() => void sendMessage(draft)}
          disabled={loading || !!retryText || !draft.trim()}
        />
        {retryText && !!error && (
          <OutlineButton
            label="Retry last question"
            onPress={() => void sendMessage(retryText, true)}
            disabled={loading}
          />
        )}

        {guidance && (
          <Card style={styles.guidanceCard}>
            <Text style={styles.heading}>Possible causes</Text>
            {guidance.possible_causes.length ? guidance.possible_causes.map((cause, index) => (
              <Text key={`${index}-${cause}`} style={styles.listItem}>• {cause}</Text>
            )) : <Text style={styles.body}>There is not enough information to suggest a likely cause.</Text>}
            <Text style={styles.heading}>Safe next steps</Text>
            {guidance.next_steps.map((step, index) => (
              <Text key={`${index}-${step}`} style={styles.listItem}>{index + 1}. {step}</Text>
            ))}
            <Text style={styles.heading}>Urgency: {guidance.urgency.toUpperCase()}</Text>
            <Text style={styles.safety}>{guidance.safety_note}</Text>
            {!!guidance.follow_up_question && (
              <Text style={styles.body}>Next question: {guidance.follow_up_question}</Text>
            )}
            {guidance.recommend_mechanic && (
              <PrimaryButton
                label="Find Nearby Mechanics"
                onPress={() => router.push({
                  pathname: '/(customer)/(tabs)/mechanics',
                  params: { vehicleType, problemType },
                })}
              />
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function parseObdContext(value?: string): ObdContext | null {
  if (!value) return null;
  try {
    const report = JSON.parse(value) as ObdContext;
    if (
      report.source === 'connected_adapter' &&
      typeof report.captured_at === 'string' &&
      Array.isArray(report.readings) &&
      Array.isArray(report.codes)
    ) return report;
  } catch {
    return null;
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { padding: 16, paddingBottom: 36 },
  safetyBanner: { backgroundColor: theme.colors.orangeLight, borderColor: '#FED7AA' },
  safety: { color: '#C2410C', lineHeight: 20, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  halfField: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  outlineAction: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  actionText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  diagnosticLabel: { color: theme.colors.muted, fontSize: 12, marginBottom: 8 },
  chat: { gap: 8, marginVertical: 12 },
  message: { maxWidth: '88%', padding: 12, borderRadius: 14 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: { color: theme.colors.text, lineHeight: 20 },
  userMessageText: { color: '#FFFFFF', fontWeight: '500' },
  quickChip: {
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickText: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },
  messageInput: { minHeight: 72, textAlignVertical: 'top' },
  guidanceCard: { marginTop: 16 },
  heading: { color: theme.colors.text, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  body: { color: theme.colors.muted, lineHeight: 20 },
  listItem: { color: theme.colors.muted, lineHeight: 20, marginBottom: 3 },
});
