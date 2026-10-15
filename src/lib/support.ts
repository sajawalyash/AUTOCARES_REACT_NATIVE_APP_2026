import { supabase } from './supabase';
import type { SupportTicket } from './types';

export async function createSupportTicket(input: {
  user_id: string;
  subject: string;
  message: string;
}) {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(input)
    .select('*')
    .single();
  return { ticket: data as SupportTicket | null, error: error?.message ?? null };
}

export async function listSupportTickets(userId?: string) {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  return { tickets: (data ?? []) as SupportTicket[], error: error?.message ?? null };
}
