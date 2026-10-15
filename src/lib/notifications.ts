import { supabase } from './supabase';
import type { AppNotification } from './types';

export async function createNotification(input: {
  user_id: string;
  title: string;
  body: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(input)
    .select('*')
    .single();
  return { notification: data as AppNotification | null, error: error?.message ?? null };
}

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { notifications: (data ?? []) as AppNotification[], error: error?.message ?? null };
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  return { error: error?.message ?? null };
}
