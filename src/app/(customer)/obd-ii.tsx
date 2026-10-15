import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';

import {
  Card,
  ErrorText,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import {
  formatObdReading,
  getBluetoothSupport,
  listObdAdapters,
  ObdConnection,
  type ObdAdapter,
  type ObdCode,
  type ObdReading,
} from '../../lib/obd';

const dashboardParameters = [
  ['01', 'MIL status / DTC count'],
  ['03', 'Fuel system status'],
  ['04', 'Calculated engine load'],
  ['05', 'Engine coolant temperature'],
  ['0C', 'Engine RPM'],
  ['0D', 'Vehicle speed'],
  ['0F', 'Intake air temperature'],
  ['11', 'Throttle position'],
  ['2F', 'Fuel level'],
  ['42', 'Control module voltage'],
] as const;

export default function ObdDiagnosticsScreen() {
  const connectionRef = useRef<ObdConnection | null>(null);
  const pollLock = useRef(false);
  const [connectionName, setConnectionName] = useState<string | null>(null);
  const [readings, setReadings] = useState<ObdReading[]>([]);
  const [codes, setCodes] = useState<ObdCode[]>([]);
  const [codeStatus, setCodeStatus] = useState<Record<ObdCode['status'], boolean> | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(() => {
    if (Platform.OS !== 'web') return null;
    const support = getBluetoothSupport();
    if (support.supported) return null;
    return support.secure
      ? 'This browser does not support Web Bluetooth. Try Chrome on Android or desktop with Bluetooth enabled.'
      : 'Web Bluetooth requires HTTPS (or localhost) and a browser that supports Bluetooth.';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [adapters, setAdapters] = useState<ObdAdapter[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!connectionName) return;
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [connectionName]);

  async function connect(adapterId?: string) {
    setLoading(true);
    setError(null);
    setUnsupported(null);
    try {
      const connection = await ObdConnection.connect(() => {
        connectionRef.current = null;
        setConnectionName(null);
        setError('The OBD-II adapter disconnected. Reconnect it to resume live readings.');
      }, adapterId);
      connectionRef.current = connection;
      setConnectionName(connection.deviceName);
      await refresh(connection);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Could not connect to the OBD-II adapter.');
    } finally {
      setLoading(false);
    }
  }

  async function findAdapters() {
    if (Platform.OS === 'web') {
      await connect();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAdapters(await listObdAdapters());
      setHasScanned(true);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Could not find Bluetooth adapters.');
    } finally {
      setLoading(false);
    }
  }

  async function refresh(connection = connectionRef.current) {
    if (!connection || pollLock.current) return;
    pollLock.current = true;
    try {
      const result = await connection.readDashboard();
      setReadings(result.readings);
      setCodes(result.codes);
      setCodeStatus(result.codeStatus);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not read valid OBD-II data.');
    } finally {
      pollLock.current = false;
    }
  }

  function disconnect() {
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setConnectionName(null);
    setReadings([]);
    setCodes([]);
    setCodeStatus(null);
    setLastUpdated(null);
    setError(null);
    setAdapters([]);
    setHasScanned(false);
  }

  function sendToAssistant() {
    if (!connectionName) return;
    const report = {
      source: 'connected_adapter' as const,
      captured_at: lastUpdated ?? new Date().toISOString(),
      readings: readings.map(({ pid, name, value, unit }) => ({ pid, name, value, unit })),
      codes: codes.map(({ code, status }) => ({ code, status })),
    };
    router.push({
      pathname: '/(customer)/(tabs)/ai-help',
      params: { diagnosticData: JSON.stringify(report) },
    });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>OBD-II Vehicle Diagnostics</Title>
        <Subtitle>
          Reads supported live parameters and trouble codes from a paired adapter. Vehicle support varies.
        </Subtitle>
        <Card>
          <Text style={styles.status}>
            Status: {connectionName ? `Connected to ${connectionName}` : 'Not connected'}
          </Text>
          <Text style={styles.note}>
            {Platform.OS === 'android'
              ? 'Android uses paired Bluetooth Classic SPP adapters. Pair the adapter in Android Bluetooth Settings first; ELM327-compatible serial adapters are required.'
              : Platform.OS === 'ios'
                ? 'iOS scans for BLE adapters exposing FFE0/FFE1 or Nordic UART serial services. Bluetooth Classic SPP adapters are not supported on iOS.'
                : 'Web support is limited to BLE adapters exposing FFE0/FFE1 or Nordic UART serial services. Classic Bluetooth SPP adapters are not supported by Web Bluetooth.'}
          </Text>
          {connectionName ? (
            <OutlineButton label="Disconnect adapter" onPress={disconnect} />
          ) : (
            <PrimaryButton
              label={loading
                ? Platform.OS === 'ios' ? 'Scanning…' : 'Connecting…'
                : Platform.OS === 'web' ? 'Connect OBD-II Device' : 'Find OBD-II Adapters'}
              onPress={() => void findAdapters()}
              disabled={loading || !!unsupported}
            />
          )}
          {!connectionName && adapters.map((adapter) => (
            <OutlineButton
              key={adapter.id}
              label={`Connect to ${adapter.name}`}
              onPress={() => void connect(adapter.id)}
              disabled={loading}
            />
          ))}
          {!connectionName && hasScanned && adapters.length === 0 && Platform.OS !== 'web' && (
            <Text style={styles.note}>
              {Platform.OS === 'android'
                ? 'No paired Bluetooth devices were found. Pair your adapter in Android Settings, then scan again.'
                : 'No BLE devices were found. Turn on your adapter, keep it nearby, and scan again.'}
            </Text>
          )}
          {connectionName && (
            <OutlineButton label="Refresh readings" onPress={() => void refresh()} disabled={loading} />
          )}
        </Card>
        <ErrorText message={unsupported} />
        <ErrorText message={error} />

        {connectionName && (
          <>
            <Text style={styles.section}>Live data from adapter</Text>
            {dashboardParameters.map(([pid, name]) => {
              const reading = readings.find((item) => item.pid === pid);
              return (
                <Card key={pid} style={styles.row}>
                  <Text style={styles.readingName}>{name}</Text>
                  <Text style={reading ? styles.readingValue : styles.note}>
                    {reading
                      ? formatObdReading(reading)
                      : loading && !lastUpdated
                        ? 'Reading…'
                        : 'Unavailable / unsupported'}
                  </Text>
                </Card>
              );
            })}
            <Text style={styles.section}>Diagnostic trouble codes</Text>
            {codes.length ? codes.map((item) => (
              <Card key={`${item.status}-${item.code}`}>
                <Text style={styles.readingValue}>{item.code}</Text>
                <Text style={styles.note}>{item.status} code · cause not confirmed</Text>
              </Card>
            )            ) : codeStatus && Object.values(codeStatus).every(Boolean) ? (
              <Card><Text style={styles.note}>No stored, pending, or permanent codes were reported.</Text></Card>
            ) : (
              <Card><Text style={styles.note}>The adapter did not return valid responses for every code mode; code status is unavailable.</Text></Card>
            )}
            <Text style={styles.note}>
              {lastUpdated
                ? `Last successful update: ${new Date(lastUpdated).toLocaleTimeString()}`
                : 'Waiting for the first valid adapter response.'}
            </Text>
            <Text style={styles.note}>
              Readings are raw adapter reports, not a battery-health test or confirmed fault diagnosis.
              Codes are read-only; this screen never clears codes. Manufacturer-specific freeze-frame
              information is not available through this generic adapter profile.
            </Text>
            {codes.length > 0 && (
              <Text style={styles.note}>
                Code meanings depend on vehicle details. Send them to the AI assistant for cautious
                interpretation; possible causes are not confirmed diagnoses.
              </Text>
            )}
            <PrimaryButton label="Discuss readings with AI assistant" onPress={sendToAssistant} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  status: { color: theme.colors.text, fontWeight: '800', marginBottom: 8 },
  note: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  section: { color: theme.colors.text, fontWeight: '800', fontSize: 17, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  readingName: { color: theme.colors.text, flex: 1, fontWeight: '600' },
  readingValue: { color: theme.colors.blue, fontWeight: '800' },
});
