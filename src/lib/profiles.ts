import { supabase } from './supabase';
import type { Profile, UserRole } from './types';

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!data && !error) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === userId) {
      const meta = authData.user.user_metadata || {};
      const fallbackRole: UserRole =
        meta.role === 'mechanic' ? 'mechanic' : meta.role === 'admin' ? 'admin' : 'customer';
      const fallbackName = meta.full_name || authData.user.email?.split('@')[0] || 'User';

      return {
        profile: {
          id: userId,
          full_name: fallbackName,
          first_name: meta.first_name || null,
          last_name: meta.last_name || null,
          role: fallbackRole,
          phone: meta.phone || null,
          avatar_url: null,
          is_disabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile,
        error: null,
      };
    }
  }

  return { profile: data as Profile | null, error: error?.message ?? null };
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  return { profile: data as Profile | null, error: error?.message ?? null };
}

export async function listProfilesByRole(role?: UserRole) {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (role) query = query.eq('role', role);
  const { data, error } = await query;
  return { profiles: (data ?? []) as Profile[], error: error?.message ?? null };
}

export async function setProfileDisabled(userId: string, isDisabled: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_disabled: isDisabled, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

export async function setProfileRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error: error?.message ?? null };
}
