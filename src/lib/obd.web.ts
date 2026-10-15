import {
  BLE_SERIAL_PROFILES,
  formatObdReading,
  initializeElm,
  readObdDashboard,
  type ObdAdapter,
  type ObdDashboard,
} from './obd-protocol';

export type { ObdAdapter, ObdCode, ObdReading, ObdReport } from './obd-protocol';
export { formatObdReading };

type BluetoothCharacteristicLike = {
  properties: { write?: boolean; writeWithoutResponse?: boolean; notify?: boolean };
  value: DataView | null;
  writeValue?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothCharacteristicLike>;
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: { target: BluetoothCharacteristicLike | null }) => void
  ): void;
};

type BluetoothServiceLike = {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
};

type BluetoothServerLike = {
  connected: boolean;
  connect(): Promise<BluetoothServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
};

type BluetoothDeviceLike = {
  name?: string;
  gatt?: BluetoothServerLike;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
};

type BluetoothApiLike = {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: {
    acceptAllDevices: true;
    optionalServices: string[];
  }): Promise<BluetoothDeviceLike>;
};

type NavigatorWithBluetooth = Navigator & { bluetooth?: BluetoothApiLike };

export function getBluetoothSupport(): { supported: boolean; secure: boolean } {
  if (typeof navigator === 'undefined') return { supported: false, secure: false };
  const secure = globalThis.isSecureContext === true;
  const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;
  return { supported: !!bluetooth && secure, secure };
}

export async function listObdAdapters(): Promise<ObdAdapter[]> {
  throw new Error('Choose an adapter using the browser Bluetooth device picker.');
}

export class ObdConnection {
  readonly deviceName: string;
  private readonly server: BluetoothServerLike;
  private readonly writer: BluetoothCharacteristicLike;
  private responseBuffer = '';
  private waiting: ((value: string) => void) | null = null;
  private rejectWaiting: ((error: Error) => void) | null = null;
  private disconnected: (() => void) | null = null;
  private locked = false;

  private constructor(
    device: BluetoothDeviceLike,
    server: BluetoothServerLike,
    writer: BluetoothCharacteristicLike,
    notifier: BluetoothCharacteristicLike
  ) {
    this.deviceName = device.name || 'OBD-II adapter';
    this.server = server;
    this.writer = writer;
    device.addEventListener('gattserverdisconnected', () => {
      this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
      this.disconnected?.();
    });
    notifier.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target?.value;
      if (!value) return;
      this.responseBuffer += new TextDecoder().decode(value);
      if (this.responseBuffer.includes('>')) {
        this.waiting?.(this.responseBuffer);
        this.waiting = null;
      }
    });
  }

  static async connect(onDisconnected: () => void, adapterId?: string): Promise<ObdConnection> {
    if (adapterId) throw new Error('Choose a Bluetooth device from the browser device picker.');
    const support = getBluetoothSupport();
    const bluetooth = typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithBluetooth).bluetooth;
    if (!support.supported || !bluetooth) {
      throw new Error(
        support.secure
          ? 'This browser does not provide Web Bluetooth. Use a compatible BLE-capable browser.'
          : 'Web Bluetooth requires a secure HTTPS page (or localhost).'
      );
    }
    if (bluetooth.getAvailability && !(await bluetooth.getAvailability())) {
      throw new Error('Bluetooth is unavailable or switched off on this device.');
    }

    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERIAL_PROFILES.map(({ service }) => service),
    });
    if (!device.gatt) {
      throw new Error('The selected adapter does not expose a Bluetooth GATT connection.');
    }
    const server = await device.gatt.connect();
    let connection: ObdConnection | null = null;
    for (const profile of BLE_SERIAL_PROFILES) {
      try {
        const service = await server.getPrimaryService(profile.service);
        const [writer, notifier] = await Promise.all([
          service.getCharacteristic(profile.write),
          service.getCharacteristic(profile.notify),
        ]);
        if (
          (!writer.properties.write && !writer.properties.writeWithoutResponse) ||
          !notifier.properties.notify
        ) continue;
        await notifier.startNotifications();
        connection = new ObdConnection(device, server, writer, notifier);
        break;
      } catch {
        // Continue probing only the explicitly supported BLE serial profiles.
      }
    }
    if (!connection) {
      server.disconnect();
      throw new Error(
        'This adapter does not expose a supported BLE serial profile (FFE0/FFE1 or Nordic UART). Classic SPP is not supported by Web Bluetooth.'
      );
    }
    connection.disconnected = onDisconnected;
    try {
      await initializeElm((command) => connection!.exchange(command));
    } catch (error) {
      connection.disconnect();
      throw error;
    }
    return connection;
  }

  disconnect() {
    this.disconnected = null;
    this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
    if (this.server.connected) this.server.disconnect();
  }

  async readDashboard(): Promise<ObdDashboard> {
    if (this.locked) throw new Error('A diagnostic request is already in progress.');
    this.locked = true;
    try {
      return await readObdDashboard((command) => this.exchange(command));
    } finally {
      this.locked = false;
    }
  }

  private async exchange(command: string): Promise<string> {
    if (!this.server.connected) throw new Error('OBD-II adapter disconnected.');
    this.responseBuffer = '';
    const response = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiting = null;
        this.rejectWaiting = null;
        reject(new Error(`Adapter timed out while processing ${command}.`));
      }, 5000);
      this.waiting = (value) => {
        clearTimeout(timeout);
        this.rejectWaiting = null;
        resolve(value);
      };
      this.rejectWaiting = (error) => {
        clearTimeout(timeout);
        this.waiting = null;
        this.rejectWaiting = null;
        reject(error);
      };
    });
    try {
      const data = new TextEncoder().encode(`${command}\r`);
      if (this.writer.writeValueWithResponse) {
        await this.writer.writeValueWithResponse(data);
      } else if (this.writer.writeValueWithoutResponse) {
        await this.writer.writeValueWithoutResponse(data);
      } else if (this.writer.writeValue) {
        await this.writer.writeValue(data);
      } else {
        throw new Error('The selected adapter cannot accept diagnostic commands.');
      }
      return await response;
    } catch (error) {
      this.waiting = null;
      this.rejectWaiting = null;
      throw error;
    }
  }
}
