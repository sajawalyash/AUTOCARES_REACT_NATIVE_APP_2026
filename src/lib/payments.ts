import { createNotification } from './notifications';
import { supabase } from './supabase';
import type { PaymentRecord, PaymentType, ServiceRequest } from './types';
import { FIXED_DIAGNOSIS_FEE } from './types';

export function formatPKR(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return 'Rs. 0 PKR';
  return `Rs. ${Number(amount).toLocaleString('en-PK')} PKR`;
}

/**
 * Fetch payment history records for a customer or mechanic.
 */
export async function listUserPayments(userId: string, role: 'customer' | 'mechanic') {
  const column = role === 'customer' ? 'customer_id' : 'mechanic_id';
  const { data, error } = await supabase
    .from('payments')
    .select('*, customer:customer_id(full_name, phone), mechanic:mechanic_id(full_name, phone), service_requests:request_id(problem_type, status, is_sos)')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  return { payments: (data ?? []) as PaymentRecord[], error: error?.message ?? null };
}

/**
 * Fetch payment records for a specific service request.
 */
export async function listRequestPayments(requestId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  return { payments: (data ?? []) as PaymentRecord[], error: error?.message ?? null };
}

/**
 * Mechanic submits or updates final repair charges for a service request.
 */
export async function submitRepairCharges(
  requestId: string,
  repairCharges: number,
  details?: { diagnosis?: string; work_performed?: string }
) {
  const updates: Record<string, unknown> = {
    repair_charges: repairCharges,
    final_cost: repairCharges,
    repair_payment_status: 'pending',
    updated_at: new Date().toISOString(),
    ...(details?.diagnosis !== undefined ? { diagnosis: details.diagnosis } : {}),
    ...(details?.work_performed !== undefined ? { work_performed: details.work_performed } : {}),
  };

  const { data, error } = await supabase
    .from('service_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  if (!error && data) {
    const totalPayable = (data.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE) + repairCharges;
    await createNotification({
      user_id: data.customer_id,
      title: 'Repair charges submitted',
      body: `Mechanic submitted repair charges: ${formatPKR(repairCharges)}. Total payable (with ${formatPKR(data.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE)} diagnosis fee): ${formatPKR(totalPayable)}.`,
    });
  }

  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

/**
 * Confirm cash payment for diagnosis fee or repair charges securely.
 */
export async function confirmServicePayment(
  requestId: string,
  paymentType: PaymentType
) {
  // 1. Try secure stored procedure first
  const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_service_payment', {
    p_request_id: requestId,
    p_payment_type: paymentType,
  });

  if (!rpcError) {
    return {
      success: true,
      message: (rpcData as { message?: string })?.message ?? 'Payment confirmed.',
      error: null,
    };
  }

  // 2. Client fallback in case custom RPC is not yet applied in Supabase instance
  const now = new Date().toISOString();
  if (paymentType === 'diagnosis_fee') {
    const { error: reqError } = await supabase
      .from('service_requests')
      .update({
        diagnosis_payment_status: 'paid',
        diagnosis_paid_at: now,
        updated_at: now,
      })
      .eq('id', requestId);

    if (reqError) return { success: false, error: reqError.message };

    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: now, updated_at: now })
      .eq('request_id', requestId)
      .eq('payment_type', 'diagnosis_fee');
  } else {
    const { error: reqError } = await supabase
      .from('service_requests')
      .update({
        repair_payment_status: 'paid',
        repair_paid_at: now,
        updated_at: now,
      })
      .eq('id', requestId);

    if (reqError) return { success: false, error: reqError.message };

    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: now, updated_at: now })
      .eq('request_id', requestId)
      .eq('payment_type', 'repair_charge');
  }

  return { success: true, message: 'Payment confirmed.', error: null };
}
