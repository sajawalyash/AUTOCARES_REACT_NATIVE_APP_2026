import { supabase } from './supabase';
import type {
  AdminActivityLog,
  AdminMechanicProfile,
  MechanicProfile,
  Rating,
  ServiceCategory,
  SupportTicket,
  UserRole,
} from './types';

export async function listServiceCategories(includeInactive = false) {
  let query = supabase.from('service_categories').select('*').order('label');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  return { categories: (data ?? []) as ServiceCategory[], error: error?.message ?? null };
}

export async function updateServiceCategory(
  id: ServiceCategory['id'],
  patch: Pick<ServiceCategory, 'label' | 'description' | 'is_active'>
) {
  const { error } = await supabase
    .from('service_categories')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function listAdminSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, profiles:user_id(full_name, phone)')
    .order('created_at', { ascending: false });
  return { tickets: (data ?? []) as SupportTicket[], error: error?.message ?? null };
}

export async function listAdminMechanicProfiles() {
  const [mechanicResult, privateDetailsResult] = await Promise.all([
    supabase
      .from('mechanic_profiles')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false }),
    supabase.from('mechanic_private_details').select('user_id, cnic_number'),
  ]);
  const privateDetails = new Map(
    (privateDetailsResult.data ?? []).map(({ user_id, cnic_number }) => [user_id, cnic_number])
  );
  const mechanics = ((mechanicResult.data ?? []) as MechanicProfile[]).map((mechanic) => ({
    ...mechanic,
    cnic_number: privateDetails.get(mechanic.user_id) ?? null,
  })) as AdminMechanicProfile[];
  const errors = [mechanicResult.error?.message, privateDetailsResult.error?.message]
    .filter((message): message is string => Boolean(message));
  return { mechanics, error: errors.length ? errors.join('\n') : null };
}

export async function updateSupportTicketStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
) {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function listAdminRatings() {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, profiles:customer_id(full_name)')
    .order('created_at', { ascending: false });
  return { ratings: (data ?? []) as (Rating & { profiles?: { full_name: string | null } })[], error: error?.message ?? null };
}

export async function deleteAdminRating(id: string) {
  const { error } = await supabase.from('ratings').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function publishAnnouncement(input: {
  title: string;
  body: string;
  role: UserRole | 'all';
}) {
  let query = supabase.from('profiles').select('id');
  if (input.role !== 'all') query = query.eq('role', input.role);
  const { data: profiles, error: profileError } = await query;
  if (profileError) return { recipientCount: 0, error: profileError.message };
  if (!profiles?.length) return { recipientCount: 0, error: 'No recipients found for this audience.' };

  const notifications = profiles.map(({ id }) => ({
    user_id: id,
    title: input.title.trim(),
    body: input.body.trim(),
  }));
  for (let offset = 0; offset < notifications.length; offset += 500) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications.slice(offset, offset + 500));
    if (error) return { recipientCount: offset, error: error.message };
  }
  return { recipientCount: notifications.length, error: null };
}

export async function recordAdminActivity(input: {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('admin_activity_logs').insert({
    ...input,
    entity_id: input.entity_id ?? null,
    details: input.details ?? {},
  });
  return { error: error?.message ?? null };
}

export async function listAdminActivity(limit = 200) {
  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { activities: (data ?? []) as AdminActivityLog[], error: error?.message ?? null };
}
