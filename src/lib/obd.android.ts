import BluetoothClassic from 'react-native-bluetooth-classic';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  formatObdReading,
  initializeElm,
  readObdDashboard,
  type ObdAdapter,
  type ObdDashboard,
} from './obd-protocol';

export type { ObdAdapter, ObdCode, ObdReading, ObdReport } from './obd-protocol';
export { formatObdReading };

async function ensureBluetoothPermission(): Promise<void> {
  if (Number(Platform.Version) < 31) return;
  const permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (!permission) throw new Error('This Android version does not expose the Bluetooth permission.');
  const result = await PermissionsAndroid.request(permission, {
    title: 'Bluetooth access',
    message: 'AutoCares needs Bluetooth access to connect to your paired OBD-II adapter.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Bluetooth permission was denied. Allow Nearby devices access to use the OBD-II adapter.');
  }
}

export function getBluetoothSupport(): { supported: boolean; secure: boolean } {
  return { supported: true, secure: true };
}

export async function listObdAdapters(): Promise<ObdAdapter[]> {
  await ensureBluetoothPermission();
  if (!(await BluetoothClassic.isBluetoothAvailable())) {
    throw new Error('Bluetooth is not available on this device.');
  }
  if (!(await BluetoothClassic.isBluetoothEnabled())) {
    throw new Error('Turn on Bluetooth and pair your OBD-II adapter in Android Settings first.');
  }
  const devices = await BluetoothClassic.getBondedDevices();
  return devices.map((device) => ({
    id: device.address,
    name: device.name || 'Paired Bluetooth device',
    transport: 'classic',
  }));
}

export class ObdConnection {
  readonly deviceName: string;
  private readonly device: Awaited<ReturnType<typeof BluetoothClassic.connectToDevice>>;
  private readonly dataSubscription: ReturnType<
    Awaited<ReturnType<typeof BluetoothClassic.connectToDevice>>['onDataReceived']
  >;
  private readonly disconnectSubscription: ReturnType<typeof BluetoothClassic.onDeviceDisconnected>;
  private responseBuffer = '';
  private waiting: ((value: string) => void) | null = null;
  private rejectWaiting: ((error: Error) => void) | null = null;
  private disconnected: (() => void) | null = null;
  private locked = false;

  private constructor(
    device: Awaited<ReturnType<typeof BluetoothClassic.connectToDevice>>,
    onDisconnected: () => void
  ) {
    this.device = device;
    this.deviceName = device.name || 'OBD-II adapter';
    this.disconnected = onDisconnected;
    this.dataSubscription = device.onDataReceived((event) => {
      this.responseBuffer += `${event.data}>`;
      this.waiting?.(this.responseBuffer);
      this.waiting = null;
    });
    this.disconnectSubscription = BluetoothClassic.onDeviceDisconnected((event) => {
      if (event.device.address === device.address) {
        this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
        this.disconnected?.();
      }
    });
  }

  static async connect(onDisconnected: () => void, adapterId?: string): Promise<ObdConnection> {
    if (!adapterId) throw new Error('Select a paired Bluetooth adapter before connecting.');
    await ensureBluetoothPermission();
    if (!(await BluetoothClassic.isBluetoothEnabled())) {
      throw new Error('Turn on Bluetooth in Android Settings before connecting.');
    }
    const device = await BluetoothClassic.connectToDevice(adapterId, { delimiter: '>' });
    if (!(await device.isConnected())) {
      throw new Error('Could not establish a Bluetooth serial connection to this device.');
    }
    const connection = new ObdConnection(device, onDisconnected);
    try {
      await initializeElm((command) => connection.exchange(command));
    } catch (error) {
      connection.disconnect();
      throw error;
    }
    return connection;
  }

  disconnect() {
    this.disconnected = null;
    this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
    this.dataSubscription.remove();
    this.disconnectSubscription.remove();
    void this.device.disconnect();
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
    if (!(await this.device.isConnected())) throw new Error('OBD-II adapter disconnected.');
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
      if (!(await this.device.write(`${command}\r`))) {
        throw new Error('The OBD-II adapter rejected the diagnostic command.');
      }
      return await response;
    } catch (error) {
      this.waiting = null;
      this.rejectWaiting = null;
      throw error;
    }
  }
}
