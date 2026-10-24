import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
              <View style={styles.aiHeaderRow}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.aiName}>AutoCares AI</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>ASSISTANT</Text>
                </View>
              </View>
              <Text style={styles.messageText}>
                Describe what your vehicle is experiencing (e.g., odd noises, overheating, battery clicks),
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
              {message.role === 'model' && (
                <View style={styles.aiHeaderRow}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.aiName}>AutoCares AI</Text>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>ASSISTANT</Text>
                  </View>
                </View>
              )}
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
            <View style={[styles.message, styles.assistantMessage, styles.loadingBubble]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Analyzing vehicle symptoms & safety data…</Text>
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
              <View style={styles.guidanceTitleRow}>
                <View style={styles.guidanceIconBox}>
                  <Ionicons name="construct" size={18} color={theme.colors.primaryDark} />
                </View>
                <View>
                  <Text style={styles.heading}>Diagnosis & Safe Steps</Text>
                  <Text style={styles.subHeadingCaption}>AI-Powered Roadside Triage</Text>
                </View>
              </View>

              <View
                style={[
                  styles.urgencyBadge,
                  guidance.urgency === 'high'
                    ? styles.urgencyHigh
                    : guidance.urgency === 'medium'
                    ? styles.urgencyMedium
                    : styles.urgencyLow,
                ]}>
                <View
                  style={[
                    styles.urgencyDot,
                    {
                      backgroundColor:
                        guidance.urgency === 'high'
                          ? '#DC2626'
                          : guidance.urgency === 'medium'
                          ? '#D97706'
                          : '#16A34A',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.urgencyText,
                    {
                      color:
                        guidance.urgency === 'high'
                          ? '#991B1B'
                          : guidance.urgency === 'medium'
                          ? '#92400E'
                          : '#166534',
                    },
                  ]}>
                  {guidance.urgency.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{guidance.summary}</Text>
            </View>

            {/* Possible Causes */}
            <Text style={styles.sectionHeaderLabel}>Possible Causes</Text>
            <View style={styles.causesList}>
              {guidance.possible_causes.length ? (
                guidance.possible_causes.map((cause, index) => (
                  <View key={`${index}-${cause}`} style={styles.causeRow}>
                    <View style={styles.causeBullet} />
                    <Text style={styles.causeText}>{cause}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.body}>No single obvious cause identified.</Text>
              )}
            </View>

            {/* Recommended Steps */}
            <Text style={styles.sectionHeaderLabel}>Recommended Next Steps</Text>
            <View style={styles.stepsList}>
              {guidance.next_steps.map((step, index) => (
                <View key={`${index}-${step}`} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Safety Caution Callout Box */}
            {guidance.safety_note ? (
              <View style={styles.safetyCallout}>
                <View style={styles.safetyIconCircle}>
                  <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                </View>
                <View style={styles.safetyCalloutContent}>
                  <Text style={styles.safetyCalloutTitle}>CRITICAL SAFETY NOTE</Text>
                  <Text style={styles.safetyCalloutText}>{guidance.safety_note}</Text>
                </View>
              </View>
            ) : null}

            {/* Follow-up Question */}
            {guidance.follow_up_question ? (
              <View style={styles.questionBox}>
                <Ionicons name="help-circle" size={17} color={theme.colors.primaryDark} />
                <Text style={styles.questionText}>{guidance.follow_up_question}</Text>
              </View>
            ) : null}

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
  chat: { gap: 12, marginVertical: 14 },
  message: {
    maxWidth: '86%',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 18,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
    ...theme.shadows.card,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  aiBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  messageText: { color: theme.colors.text, lineHeight: 21, fontSize: 13.5 },
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
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#D6F1FA',
    backgroundColor: '#FFFFFF',
    ...theme.shadows.cardElevated,
  },
  guidanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guidanceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF8FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15.5,
  },
  subHeadingCaption: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  urgencyHigh: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  urgencyMedium: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  urgencyLow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  summaryText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  sectionHeaderLabel: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 13.5,
    marginTop: 6,
    marginBottom: 8,
  },
  causesList: {
    gap: 6,
    marginBottom: 14,
  },
  causeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  causeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 6,
  },
  causeText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  stepsList: {
    gap: 8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  safetyCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  safetyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  safetyCalloutContent: {
    flex: 1,
  },
  safetyCalloutTitle: {
    color: '#92400E',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  safetyCalloutText: {
    color: '#78350F',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  questionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF8FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6F1FA',
    padding: 12,
    marginBottom: 14,
  },
  questionText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  body: {
    color: theme.colors.muted,
    fontSize: 13,
  },
});
