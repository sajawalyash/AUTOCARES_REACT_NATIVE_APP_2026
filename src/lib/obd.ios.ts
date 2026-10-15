import { Buffer } from 'buffer';
import { BleManager, State, type Device, type Subscription } from 'react-native-ble-plx';

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

const manager = new BleManager();

async function ensureBluetoothReady(): Promise<void> {
  const state = await manager.state();
  if (state === State.Unauthorized) {
    throw new Error('Bluetooth access is denied. Allow AutoCares Bluetooth access in iOS Settings.');
  }
  if (state === State.Unsupported) {
    throw new Error('This device does not support Bluetooth Low Energy.');
  }
  if (state !== State.PoweredOn) {
    throw new Error('Turn on Bluetooth to scan for or connect to a BLE OBD-II adapter.');
  }
}

export function getBluetoothSupport(): { supported: boolean; secure: boolean } {
  return { supported: true, secure: true };
}

export async function listObdAdapters(): Promise<ObdAdapter[]> {
  await ensureBluetoothReady();
  const devices = new Map<string, ObdAdapter>();
  let scanError: Error | null = null;
  await manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      scanError = error;
      void manager.stopDeviceScan();
      return;
    }
    if (!device) return;
    devices.set(device.id, {
      id: device.id,
      name: device.name || device.localName || 'BLE device',
      transport: 'ble',
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 8000));
  await manager.stopDeviceScan();
  if (scanError) throw scanError;
  return [...devices.values()].sort((first, second) => first.name.localeCompare(second.name));
}

export class ObdConnection {
  readonly deviceName: string;
  private readonly device: Device;
  private readonly profile: (typeof BLE_SERIAL_PROFILES)[number];
  private readonly notificationSubscription: Subscription;
  private readonly disconnectSubscription: Subscription;
  private responseBuffer = '';
  private waiting: ((value: string) => void) | null = null;
  private rejectWaiting: ((error: Error) => void) | null = null;
  private disconnected: (() => void) | null = null;
  private locked = false;

  private constructor(
    device: Device,
    profile: (typeof BLE_SERIAL_PROFILES)[number],
    onDisconnected: () => void
  ) {
    this.device = device;
    this.profile = profile;
    this.deviceName = device.name || device.localName || 'BLE OBD-II adapter';
    this.disconnected = onDisconnected;
    this.notificationSubscription = manager.monitorCharacteristicForDevice(
      device.id,
      profile.service,
      profile.notify,
      (error, characteristic) => {
        if (error) {
          this.rejectWaiting?.(new Error(error.message));
          return;
        }
        if (!characteristic?.value) return;
        this.responseBuffer += Buffer.from(characteristic.value, 'base64').toString('utf8');
        if (this.responseBuffer.includes('>')) {
          this.waiting?.(this.responseBuffer);
          this.waiting = null;
        }
      }
    );
    this.disconnectSubscription = manager.onDeviceDisconnected(device.id, () => {
      this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
      this.disconnected?.();
    });
  }

  static async connect(onDisconnected: () => void, adapterId?: string): Promise<ObdConnection> {
    if (!adapterId) throw new Error('Select a BLE adapter from the device list before connecting.');
    await ensureBluetoothReady();
    let device: Device | null = null;
    let connection: ObdConnection | null = null;
    try {
      device = await manager.connectToDevice(adapterId, { timeout: 12000 });
      await manager.discoverAllServicesAndCharacteristicsForDevice(device.id);
      const services = await device.services();
      let selectedProfile: (typeof BLE_SERIAL_PROFILES)[number] | null = null;
      for (const profile of BLE_SERIAL_PROFILES) {
        const serviceExists = services.some(
          (service) => service.uuid.toLowerCase() === profile.service
        );
        if (!serviceExists) continue;
        const characteristics = await device.characteristicsForService(profile.service);
        const writable = characteristics.some((item) =>
          item.uuid.toLowerCase() === profile.write &&
          (item.isWritableWithResponse || item.isWritableWithoutResponse)
        );
        const notifiable = characteristics.some((item) =>
          item.uuid.toLowerCase() === profile.notify &&
          (item.isNotifiable || item.isIndicatable)
        );
        if (writable && notifiable) {
          selectedProfile = profile;
          break;
        }
      }
      if (!selectedProfile) {
        throw new Error(
          'This adapter does not expose a supported BLE serial profile (FFE0/FFE1 or Nordic UART).'
        );
      }
      const established = new ObdConnection(device, selectedProfile, onDisconnected);
      connection = established;
      await initializeElm((command) => established.exchange(command));
      return established;
    } catch (error) {
      if (connection) connection.disconnect();
      else if (device) await manager.cancelDeviceConnection(device.id);
      throw error;
    }
  }

  disconnect() {
    this.disconnected = null;
    this.rejectWaiting?.(new Error('OBD-II adapter disconnected.'));
    this.notificationSubscription.remove();
    this.disconnectSubscription.remove();
    void manager.cancelDeviceConnection(this.device.id);
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
    if (!(await manager.isDeviceConnected(this.device.id))) {
      throw new Error('OBD-II adapter disconnected.');
    }
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
      await manager.writeCharacteristicWithResponseForDevice(
        this.device.id,
        this.profile.service,
        this.profile.write,
        Buffer.from(`${command}\r`, 'utf8').toString('base64')
      ).catch(async (error: unknown) => {
        const characteristics = await this.device.characteristicsForService(this.profile.service);
        const canWriteWithoutResponse = characteristics.some((item) =>
          item.uuid.toLowerCase() === this.profile.write && item.isWritableWithoutResponse
        );
        if (!canWriteWithoutResponse) throw error;
        await manager.writeCharacteristicWithoutResponseForDevice(
          this.device.id,
          this.profile.service,
          this.profile.write,
          Buffer.from(`${command}\r`, 'utf8').toString('base64')
        );
      });
      return await response;
    } catch (error) {
      this.waiting = null;
      this.rejectWaiting = null;
      throw error;
    }
  }
}
