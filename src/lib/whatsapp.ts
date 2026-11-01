import { Linking } from 'react-native';

import { customAlert } from '../components/custom-alert';

/**
 * Normalizes a phone number to standard international format (digits only, no '+' or leading zeros).
 * Handles Pakistani mobile numbers (e.g., 03001234567, 3001234567, +923001234567) as well as general international numbers.
 */
export function normalizePhoneNumber(rawPhone: string | null | undefined): {
  isValid: boolean;
  formatted: string;
  error: string | null;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, formatted: '', error: 'Phone number is not provided.' };
  }

  let cleaned = rawPhone.trim();

  // Strip all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');

  if (!cleaned) {
    return { isValid: false, formatted: '', error: 'Phone number contains no valid digits.' };
  }

  // Handle international prefix '00'
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // Handle Pakistani domestic formats:
  // Standard domestic mobile (11 digits starting with 03): 03001234567 -> 923001234567
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.slice(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    // Missing leading trunk zero: 3001234567 -> 923001234567
    cleaned = '92' + cleaned;
  } else if (cleaned.startsWith('9203') && cleaned.length === 13) {
    // 9203... -> remove redundant trunk zero
    cleaned = '92' + cleaned.slice(3);
  }

  // E.164 standard: minimum 8 digits, maximum 15 digits
  if (cleaned.length < 8 || cleaned.length > 15) {
    return {
      isValid: false,
      formatted: cleaned,
      error: `Invalid phone number length (${cleaned.length} digits). Expected 8–15 digits.`,
    };
  }

  return { isValid: true, formatted: cleaned, error: null };
}

/**
 * Generates a clean human-readable assistance request reference.
 * Example: AC-9F2B
 */
export function getShortRequestRef(requestId: string): string {
  if (!requestId) return 'AC-REQ';
  const clean = requestId.replace(/-/g, '');
  return `AC-${clean.slice(0, 6).toUpperCase()}`;
}

export type WhatsAppContactRole = 'customer' | 'mechanic';

export interface WhatsAppContactOptions {
  phone: string | null | undefined;
  participantName?: string | null;
  role: WhatsAppContactRole;
  requestId: string;
  customMessage?: string;
}

/**
 * Builds the contextual prefilled message for WhatsApp communication.
 */
export function getContextualMessage(
  role: WhatsAppContactRole,
  requestId: string
): string {
  const ref = getShortRequestRef(requestId);
  if (role === 'customer') {
    // Customer contacting the assigned mechanic
    return `Assalam-o-Alaikum! I'm contacting you through AutoCares regarding roadside assistance request ${ref}. Please share an update on the service.`;
  }
  // Mechanic contacting the customer
  return `Assalam-o-Alaikum! I'm the mechanic assigned to your AutoCares roadside assistance request ${ref}. I'm contacting you to coordinate the service.`;
}

/**
 * Generates the WhatsApp Click-to-Chat URL.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedText}`;
}

/**
 * Opens WhatsApp click-to-chat after confirming with the user that they are leaving AutoCares.
 */
export async function openWhatsAppChat(options: WhatsAppContactOptions): Promise<void> {
  const { phone, participantName, role, requestId, customMessage } = options;

  const { isValid, formatted, error } = normalizePhoneNumber(phone);
  if (!isValid || !formatted) {
    customAlert.error(
      'Phone Number Unavailable',
      error ?? 'The participant has not provided a valid phone number for WhatsApp messaging.'
    );
    return;
  }

  const message = customMessage || getContextualMessage(role, requestId);
  const waUrl = buildWhatsAppUrl(formatted, message);
  const targetLabel = participantName ? participantName : role === 'customer' ? 'the mechanic' : 'the customer';

  customAlert({
    title: 'Open WhatsApp',
    subtitle: `Contacting ${targetLabel}`,
    message: `You are leaving AutoCares to contact ${targetLabel} on WhatsApp.\n\nMessages are sent externally through your WhatsApp application.`,
    type: 'whatsapp',
    confirmText: 'Continue to WhatsApp',
    cancelText: 'Cancel',
    onConfirm: async () => {
      try {
        await Linking.openURL(waUrl);
      } catch {
        customAlert.error(
          'Could Not Open WhatsApp',
          'WhatsApp does not appear to be installed or cannot open this link. You can use standard phone calls instead.'
        );
      }
    },
  });
}

/**
 * Initiates a standard phone call using the operating system's dialer.
 */
export async function callParticipant(
  phone: string | null | undefined,
  participantName?: string | null
): Promise<void> {
  if (!phone) {
    customAlert.error('Phone Number Missing', 'No contact phone number is available for this participant.');
    return;
  }

  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) {
    customAlert.error('Invalid Number', 'Could not parse a valid phone number for calling.');
    return;
  }

  const targetLabel = participantName ? participantName : 'this contact';

  customAlert.confirm(
    'Call Contact',
    `Would you like to open your phone dialer to call ${targetLabel}?`,
    async () => {
      const telUrl = `tel:${cleaned}`;
      try {
        await Linking.openURL(telUrl);
      } catch {
        customAlert.error('Call Failed', 'Unable to open the phone dialer on this device.');
      }
    },
    undefined,
    'Call',
    'Cancel'
  );
}

/**
 * Official AutoCares 24/7 Roadside Assistance & Admin Support Configuration.
 * Centralized helpline accessible 24 hours a day, 7 days a week.
 */
export const AUTOCARES_SUPPORT_CONFIG = {
  raw: '03390892660',
  formatted: '0339 0892660',
  international: '+923390892660',
  digits: '923390892660',
  telUrl: 'tel:03390892660',
  badge: 'ADMIN SUPPORT AVAILABLE 24/7',
  availability: 'Available 24/7',
  message:
    'Need assistance? Our AutoCares support team is available 24/7 to help customers and mechanics with service requests, technical issues, emergency assistance, and general inquiries.',
};

export const AUTOCARES_SUPPORT_PHONE =
  process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_PHONE || AUTOCARES_SUPPORT_CONFIG.digits;

/**
 * Directly initiates a call to the official AutoCares Admin Helpline.
 */
export async function callAdminHelpline(): Promise<void> {
  customAlert.confirm(
    'AutoCares 24/7 Helpline',
    `Would you like to dial the AutoCares Admin Helpline at ${AUTOCARES_SUPPORT_CONFIG.formatted}?\n\nOur support team is available 24/7 for instant assistance.`,
    async () => {
      try {
        await Linking.openURL(AUTOCARES_SUPPORT_CONFIG.telUrl);
      } catch {
        customAlert.error(
          'Call Failed',
          `Unable to open phone dialer. Please dial ${AUTOCARES_SUPPORT_CONFIG.formatted} directly.`
        );
      }
    },
    undefined,
    'Call 0339 0892660',
    'Cancel'
  );
}

/**
 * Connects directly to AutoCares 24/7 Roadside Assistance / Dispatch helpline on WhatsApp.
 */
export async function openWhatsAppSupport(
  role: 'customer' | 'mechanic' = 'customer',
  context?: string
): Promise<void> {
  const phone = AUTOCARES_SUPPORT_CONFIG.digits;
  const { isValid, formatted } = normalizePhoneNumber(phone);
  const targetNumber = isValid && formatted ? formatted : '923390892660';

  customAlert.whatsapp({
    role,
    phone: targetNumber,
    displayNumber: AUTOCARES_SUPPORT_CONFIG.formatted,
    context,
    description: AUTOCARES_SUPPORT_CONFIG.message,
  });
}
