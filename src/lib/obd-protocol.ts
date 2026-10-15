export type ObdReading = {
  pid: string;
  name: string;
  value: number;
  unit: string;
};

export type ObdCode = {
  code: string;
  status: 'stored' | 'pending' | 'permanent';
};

export type ObdReport = {
  source: 'connected_adapter';
  captured_at: string;
  readings: ObdReading[];
  codes: ObdCode[];
};

export type ObdAdapter = {
  id: string;
  name: string;
  transport: 'ble' | 'classic';
};

export type ObdDashboard = {
  readings: ObdReading[];
  codes: ObdCode[];
  codeStatus: Record<ObdCode['status'], boolean>;
};

export const BLE_SERIAL_PROFILES = [
  {
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    write: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notify: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
  {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    write: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notify: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
] as const;

const pidNames: Record<string, { name: string; unit: string }> = {
  '01': { name: 'MIL status / DTC count', unit: '' },
  '03': { name: 'Fuel system status', unit: '' },
  '04': { name: 'Calculated engine load', unit: '%' },
  '05': { name: 'Engine coolant temperature', unit: '°C' },
  '0C': { name: 'Engine RPM', unit: 'rpm' },
  '0D': { name: 'Vehicle speed', unit: 'km/h' },
  '0F': { name: 'Intake air temperature', unit: '°C' },
  '11': { name: 'Throttle position', unit: '%' },
  '2F': { name: 'Fuel level', unit: '%' },
  '42': { name: 'Control module voltage', unit: 'V' },
};

const fuelSystemStates: Record<number, string> = {
  1: 'Open loop (insufficient engine temperature)',
  2: 'Closed loop (oxygen sensor feedback)',
  4: 'Open loop (engine load or deceleration)',
  8: 'Open loop (system fault)',
  16: 'Closed loop (fault with at least one oxygen sensor)',
};

export async function initializeElm(
  exchange: (command: string) => Promise<string>
): Promise<void> {
  await exchange('ATZ');
  await exchange('ATE0');
  await exchange('ATL0');
  await exchange('ATS1');
  await exchange('ATH0');
  await exchange('ATSP0');
  const protocol = await exchange('0100');
  if (!parseSupportedPids(protocol, '00').length) {
    throw new Error('The adapter connected, but the vehicle did not report standard OBD-II support.');
  }
}

export async function readObdDashboard(
  exchange: (command: string) => Promise<string>
): Promise<ObdDashboard> {
  const supported = new Set<string>();
  for (const base of ['00', '20', '40']) {
    const response = await exchange(`01${base}`);
    parseSupportedPids(response, base).forEach((pid) => supported.add(pid));
  }

  const readings: ObdReading[] = [];
  for (const pid of Object.keys(pidNames)) {
    if (!supported.has(pid)) continue;
    const response = await exchange(`01${pid}`);
    const bytes = responseBytes(response, `41${pid}`);
    if (bytes.length < 1) continue;
    const value = decodePid(pid, bytes);
    if (value !== null && Number.isFinite(value)) {
      readings.push({ pid, ...pidNames[pid], value });
    }
  }

  const codes: ObdCode[] = [];
  const codeStatus: Record<ObdCode['status'], boolean> = {
    stored: false,
    pending: false,
    permanent: false,
  };
  for (const mode of [
    { command: '03', header: '43', status: 'stored' as const },
    { command: '07', header: '47', status: 'pending' as const },
    { command: '0A', header: '4A', status: 'permanent' as const },
  ]) {
    const response = await exchange(mode.command);
    codeStatus[mode.status] = hasResponseHeader(response, mode.header);
    responseBytes(response, mode.header).forEach((code) => {
      if (!codes.some((existing) => existing.code === code)) {
        codes.push({ code, status: mode.status });
      }
    });
  }
  return { readings, codes, codeStatus };
}

export function formatObdReading(reading: ObdReading): string {
  if (reading.pid === '01') {
    const milOn = reading.value >= 1000;
    return `MIL ${milOn ? 'on' : 'off'} · ${reading.value % 1000} DTCs`;
  }
  if (reading.pid === '03') {
    return fuelSystemStates[reading.value] ?? `Status byte ${reading.value}`;
  }
  return `${reading.value} ${reading.unit}`.trim();
}

function responseBytes(response: string, expectedHeader: string): string[] {
  const bytes = response.toUpperCase().match(/\b[0-9A-F]{2}\b/g) ?? [];
  const headerIndex = bytes.findIndex((byte, index) =>
    byte === expectedHeader.slice(0, 2) && bytes[index + 1] === expectedHeader.slice(2)
  );
  if (headerIndex < 0) return [];
  const data = bytes.slice(headerIndex + 2);
  if (['43', '47', '4A'].includes(expectedHeader)) {
    const codes: string[] = [];
    for (let index = 0; index + 1 < data.length; index += 2) {
      const first = Number.parseInt(data[index], 16);
      const second = Number.parseInt(data[index + 1], 16);
      if (first === 0 && second === 0) continue;
      const prefix = 'PBCU'[(first & 0xc0) >> 6];
      const digit = ((first & 0x30) >> 4).toString();
      codes.push(`${prefix}${digit}${(first & 0x0f).toString(16).toUpperCase()}${data[index + 1]}`);
    }
    return codes;
  }
  return data;
}

function hasResponseHeader(response: string, expectedHeader: string): boolean {
  const bytes = response.toUpperCase().match(/\b[0-9A-F]{2}\b/g) ?? [];
  return bytes.some((byte, index) =>
    byte === expectedHeader.slice(0, 2) && bytes[index + 1] === expectedHeader.slice(2)
  );
}

function parseSupportedPids(response: string, base: string): string[] {
  const bytes = responseBytes(response, `41${base}`);
  if (bytes.length < 4) return [];
  const mask = Number.parseInt(bytes.slice(0, 4).join(''), 16);
  const offset = Number.parseInt(base, 16);
  return Array.from({ length: 32 }, (_, index) => offset + index + 1)
    .filter((pid) => (mask & (1 << (31 - (pid - offset - 1)))) !== 0)
    .map((pid) => pid.toString(16).padStart(2, '0').toUpperCase());
}

function decodePid(pid: string, bytes: string[]): number | null {
  const first = Number.parseInt(bytes[0], 16);
  const second = Number.parseInt(bytes[1] ?? '00', 16);
  switch (pid) {
    case '01':
      return (first & 0x80 ? 1000 : 0) + (first & 0x7f);
    case '03':
      return first;
    case '04':
    case '11':
    case '2F':
      return Math.round((first * 1000) / 255) / 10;
    case '05':
    case '0F':
      return first - 40;
    case '0C':
      return Math.round(((first * 256 + second) / 4) * 10) / 10;
    case '0D':
      return first;
    case '42':
      return Math.round(((first * 256 + second) / 1000) * 100) / 100;
    default:
      return null;
  }
}
