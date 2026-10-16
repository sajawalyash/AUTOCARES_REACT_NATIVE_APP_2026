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
type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'other';
const quickSymptoms = [
  'Vehicle will not start',
  'Engine is overheating',
  'Unusual grinding noise',
  'Check Engine light is on',
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
  const [fuelType] = useState<FuelType | null>(null);
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
          Fast vehicle troubleshooting and safe next steps. Informational guidance only.
        </Subtitle>

        {/* Safety Banner (Orange Accent) */}
        <Card style={styles.safetyBanner}>
          <Text style={styles.safetyTitle}>⚠️ Roadside Safety Advisory</Text>
          <Text style={styles.safety}>
            If steering or brakes fail, fuel leaks, or severe overheating occurs, pull over safely to
            the roadside and request an on-site mechanic immediately.
          </Text>
        </Card>

        {/* Vehicle Selection Chips */}
        <Label>Vehicle Type</Label>
        <View style={styles.chips}>
          {vehicleTypes.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: vehicleType === type }}
              style={[styles.chip, vehicleType === type && styles.chipSelected]}
              onPress={() => setVehicleType(type)}>
              <Text style={[styles.chipText, vehicleType === type && styles.chipTextSelected]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <Field value={make} onChangeText={setMake} placeholder="Make" style={styles.halfField} />
          <Field value={model} onChangeText={setModel} placeholder="Model" style={styles.halfField} />
          <Field value={year} onChangeText={setYear} placeholder="Year" keyboardType="number-pad" style={{ width: 75 }} />
        </View>

        {/* Category Chips */}
        <Label>Service Category</Label>
        <View style={styles.chips}>
          {activeCategories.slice(0, 6).map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: problemType === category.id }}
              style={[styles.chip, problemType === category.id && styles.chipSelected]}
              onPress={() => setProblemType(category.id)}>
              <Text style={[styles.chipText, problemType === category.id && styles.chipTextSelected]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.outlineAction}
            onPress={() => router.push('/(customer)/obd-ii')}>
            <Text style={styles.actionText}>Connect OBD-II</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.outlineAction} onPress={startNewDiagnosis}>
            <Text style={styles.actionText}>Reset Session</Text>
          </Pressable>
        </View>

        {diagnostics && (
          <View style={styles.diagnosticBadge}>
            <Text style={styles.diagnosticText}>
              ✓ Attached OBD-II parameters ({new Date(diagnostics.captured_at).toLocaleTimeString()})
            </Text>
          </View>
        )}

        {/* Chat History */}
        <View style={styles.chat}>
          {messages.length === 0 && (
            <View style={[styles.message, styles.assistantMessage]}>
              <Text style={styles.messageText}>
                Describe what your vehicle is experiencing (e.g., odd noises, smoke, battery clicks),
                and I will walk you through safe troubleshooting steps.
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
              <Text style={styles.messageText}>Analyzing symptoms safely…</Text>
            </View>
          )}
        </View>

        {messages.length === 0 && (
          <>
            <Label>Common Symptoms</Label>
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
          placeholder="Describe what happened or reply..."
          multiline
          maxLength={1500}
          style={styles.messageInput}
          editable={!loading && !retryText}
          accessibilityLabel="Describe the vehicle problem"
        />

        <PrimaryButton
          label={loading ? 'Analyzing…' : 'Send to Assistant'}
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

        {/* Detailed AI Guidance Card */}
        {guidance && (
          <Card style={styles.guidanceCard}>
            <View style={styles.guidanceHeader}>
              <Text style={styles.heading}>Diagnosis & Safe Next Steps</Text>
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>{guidance.urgency.toUpperCase()} PRIORITY</Text>
              </View>
            </View>

            <Text style={styles.subHeading}>Possible Causes:</Text>
            {guidance.possible_causes.length ? (
              guidance.possible_causes.map((cause, index) => (
                <Text key={`${index}-${cause}`} style={styles.listItem}>
                  • {cause}
                </Text>
              ))
            ) : (
              <Text style={styles.body}>No single obvious cause identified.</Text>
            )}

            <Text style={styles.subHeading}>Recommended Steps:</Text>
            {guidance.next_steps.map((step, index) => (
              <Text key={`${index}-${step}`} style={styles.listItem}>
                {index + 1}. {step}
              </Text>
            ))}

            <Text style={styles.safetyNote}>{guidance.safety_note}</Text>

            {guidance.recommend_mechanic && (
              <PrimaryButton
                variant="orange"
                label="Find Nearby Mechanics Now"
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/(tabs)/mechanics',
                    params: { vehicleType, problemType },
                  })
                }
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
    )
      return report;
  } catch {
    return null;
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  content: { padding: 16, paddingBottom: 36 },
  safetyBanner: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.orangeSubtle,
    borderWidth: 1.5,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  safetyTitle: {
    color: theme.colors.orangeText,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  safety: {
    color: theme.colors.orangeText,
    lineHeight: 19,
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1.5,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  outlineAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  actionText: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  diagnosticBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 8,
    marginBottom: 12,
  },
  diagnosticText: {
    color: theme.colors.yellowText,
    fontSize: 12,
    fontWeight: '700',
  },
  chat: { gap: 10, marginVertical: 12 },
  message: { maxWidth: '85%', padding: 14, borderRadius: theme.radius.lg },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary, // Sky Blue
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
    ...theme.shadows.card,
  },
  messageText: { color: theme.colors.text, lineHeight: 20, fontSize: 14 },
  userMessageText: { color: '#FFFFFF', fontWeight: '600' },
  quickChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
  },
  quickText: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },
  messageInput: { minHeight: 76, textAlignVertical: 'top' },
  guidanceCard: {
    marginTop: 20,
    borderRadius: theme.radius.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.primarySubtle,
    ...theme.shadows.cardElevated,
  },
  guidanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heading: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
  },
  urgencyBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgencyText: {
    color: theme.colors.yellowText,
    fontSize: 10,
    fontWeight: '800',
  },
  subHeading: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  body: { color: theme.colors.muted, lineHeight: 20, fontSize: 13 },
  listItem: { color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 3, fontSize: 13 },
  safetyNote: {
    color: theme.colors.orangeText,
    backgroundColor: theme.colors.orangeLight,
    padding: 10,
    borderRadius: theme.radius.sm,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginVertical: 12,
  },
});
