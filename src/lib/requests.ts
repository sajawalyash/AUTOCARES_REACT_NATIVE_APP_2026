import { supabase } from './supabase';
import type { MechanicLocation, ProblemType, RequestStatus, ServiceRequest } from './types';
import { FIXED_DIAGNOSIS_FEE } from './types';
import { createNotification } from './notifications';

export async function createServiceRequest(input: {
  customer_id: string;
  mechanic_id?: string | null;
  vehicle_id?: string | null;
  problem_type: ProblemType;
  description?: string;
  customer_lat?: number | null;
  customer_lng?: number | null;
  estimated_arrival_minutes?: number | null;
  is_sos?: boolean;
}) {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      ...input,
      diagnosis_fee: FIXED_DIAGNOSIS_FEE,
      diagnosis_payment_status: 'pending',
      status: 'pending',
      is_sos: input.is_sos ?? false,
    })
    .select('*')
    .single();
  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

export async function listCustomerRequests(customerId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, vehicles:vehicle_id(make, model, year, registration_number)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listPendingRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listMechanicJobs(mechanicId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listAllRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function getRequest(id: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('id', id)
    .maybeSingle();
  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

export async function acceptRequest(requestId: string, mechanicId: string, etaMinutes: number) {
  const { data: current, error: fetchError } = await supabase
    .from('service_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !current) {
    return { request: null, error: fetchError?.message ?? 'Request not found' };
  }
  if (current.status !== 'pending') {
    return { request: null, error: 'This request is no longer available.' };
  }

  const { data, error } = await supabase
    .from('service_requests')
    .update({
      mechanic_id: mechanicId,
      status: 'accepted' satisfies RequestStatus,
      estimated_arrival_minutes: etaMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return { request: null, error: error?.message ?? 'Could not accept request.' };
  }

  await createNotification({
    user_id: data.customer_id,
    title: 'Mechanic assigned',
    body: 'A mechanic accepted your roadside request.',
  });

  return { request: data as ServiceRequest, error: null };
}

export async function rejectRequest(requestId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  patch: Partial<
    Pick<
      ServiceRequest,
      | 'diagnosis'
      | 'work_performed'
      | 'final_cost'
      | 'repair_charges'
      | 'diagnosis_payment_status'
      | 'repair_payment_status'
      | 'dispute_flag'
    >
  > = {}
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...patch,
  };
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('service_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  if (!error && data) {
    await createNotification({
      user_id: data.customer_id,
      title: 'Request updated',
      body: `Your request is now ${status.replace('_', ' ')}.`,
    });
    if (status === 'completed' && data.mechanic_id) {
      const { data: mp } = await supabase
        .from('mechanic_profiles')
        .select('completed_jobs')
        .eq('user_id', data.mechanic_id)
        .single();
      if (mp) {
        await supabase
          .from('mechanic_profiles')
          .update({ completed_jobs: (mp.completed_jobs ?? 0) + 1 })
          .eq('user_id', data.mechanic_id);
      }
    }
  }

  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

export async function setRequestDisputeFlag(requestId: string, disputeFlag: boolean) {
  const { error } = await supabase
    .from('service_requests')
    .update({ dispute_flag: disputeFlag, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  return { error: error?.message ?? null };
}

export async function cancelRequest(requestId: string) {
  return updateRequestStatus(requestId, 'cancelled');
}

export async function upsertMechanicLocation(input: {
  request_id: string;
  mechanic_id: string;
  latitude: number;
  longitude: number;
}) {
  const { data, error } = await supabase
    .from('mechanic_locations')
    .insert(input)
    .select('*')
    .single();
  return { location: data as MechanicLocation | null, error: error?.message ?? null };
}

export async function getLatestMechanicLocation(requestId: string) {
  const { data, error } = await supabase
    .from('mechanic_locations')
    .select('*')
    .eq('request_id', requestId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { location: data as MechanicLocation | null, error: error?.message ?? null };
}
