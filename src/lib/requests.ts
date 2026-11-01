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

  if (!error && data?.mechanic_id) {
    await createNotification({
      user_id: data.mechanic_id,
      title: input.is_sos ? '🚨 Emergency SOS Assistance Request' : 'New Roadside Assistance Request',
      body: input.is_sos
        ? 'An emergency roadside SOS assistance request has been assigned to you. Review and accept immediately.'
        : 'A customer has sent you a roadside assistance request. Tap to review customer and vehicle details.',
    });
  }

  return { request: data as ServiceRequest | null, error: error?.message ?? null };
}

export async function listCustomerRequests(customerId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, mechanic:mechanic_id(id, full_name, phone, avatar_url), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listPendingRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone, avatar_url), mechanic:mechanic_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listPendingRequestsForMechanic(mechanicId?: string) {
  let query = supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone, avatar_url), mechanic:mechanic_id(full_name, phone), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (mechanicId) {
    query = query.or(`mechanic_id.eq.${mechanicId},mechanic_id.is.null`);
  }

  const { data, error } = await query;
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listMechanicJobs(mechanicId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone, avatar_url), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function listAllRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(full_name, phone, avatar_url), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .order('created_at', { ascending: false });
  return { requests: (data ?? []) as ServiceRequest[], error: error?.message ?? null };
}

export async function getRequest(id: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      '*, profiles:customer_id(id, full_name, phone, avatar_url), mechanic:mechanic_id(id, full_name, phone, avatar_url), vehicles:vehicle_id(vehicle_type, make, model, year, registration_number)'
    )
    .eq('id', id)
    .maybeSingle();

  if (data && data.mechanic_id) {
    const { data: mp } = await supabase
      .from('mechanic_profiles')
      .select('workshop_name, mechanic_type, latitude, longitude')
      .eq('user_id', data.mechanic_id)
      .maybeSingle();
    if (mp && data.mechanic) {
      data.mechanic.workshop_name = mp.workshop_name;
      data.mechanic.mechanic_type = mp.mechanic_type;
      data.mechanic.latitude = mp.latitude;
      data.mechanic.longitude = mp.longitude;
    }
  }

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
    return { request: null, error: 'This request is no longer available or was already accepted.' };
  }

  const { data, error } = await supabase
    .from('service_requests')
    .update({
      mechanic_id: mechanicId,
      status: 'accepted',
      estimated_arrival_minutes: etaMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return { request: null, error: error?.message ?? 'Could not accept request. Another technician may have accepted it.' };
  }

  const { data: mechProf } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', mechanicId)
    .maybeSingle();
  const mechanicName = mechProf?.full_name ?? 'An AutoCares mechanic';

  await createNotification({
    user_id: data.customer_id,
    title: 'Mechanic Accepted Your Request!',
    body: `${mechanicName} has accepted your roadside assistance request (ETA: ~${etaMinutes} mins). Tap to view mechanic details and live coordination.`,
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

  if (!error && data) {
    await createNotification({
      user_id: data.customer_id,
      title: 'Mechanic Unavailable',
      body: 'The selected mechanic was unable to accept your request at this time. Tap to find and contact another available mechanic.',
    });
  }

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

  let { data, error } = await supabase
    .from('service_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  // Graceful fallback if database enum doesn't have on_the_way or arrived yet
  if (error && error.message.includes('enum request_status')) {
    if (status === 'on_the_way') {
      updates.status = 'en_route';
      const retry = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', requestId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    } else if (status === 'arrived') {
      updates.status = 'in_progress';
      const retry = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', requestId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (!error && data) {
    let notifTitle = 'Request updated';
    let notifBody = `Your request is now ${status.replace('_', ' ')}.`;

    if (status === 'on_the_way' || status === 'en_route') {
      notifTitle = 'Mechanic On The Way 🚗';
      notifBody = 'The mechanic is travelling to your vehicle location. You can view real-time coordination on your dashboard.';
    } else if (status === 'arrived') {
      notifTitle = 'Mechanic Has Arrived 📍';
      notifBody = 'The mechanic has reached your vehicle location. Look out for the technician.';
    } else if (status === 'in_progress') {
      notifTitle = 'Service In Progress 🔧';
      notifBody = 'The technician has started inspection and repair work on your vehicle.';
    } else if (status === 'completed') {
      notifTitle = 'Service Completed! 🎉';
      notifBody = 'Your roadside assistance service has been completed. Please review your billing receipt.';
    } else if (status === 'cancelled') {
      notifTitle = 'Request Cancelled';
      notifBody = 'Your roadside assistance request has been cancelled.';
      if (data.mechanic_id) {
        await createNotification({
          user_id: data.mechanic_id,
          title: 'Request Cancelled',
          body: 'The customer has cancelled their assistance request.',
        });
      }
    }

    await createNotification({
      user_id: data.customer_id,
      title: notifTitle,
      body: notifBody,
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
