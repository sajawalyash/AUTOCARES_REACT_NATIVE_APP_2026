import { distanceKm, etaMinutesFromDistance } from './geo';
import { supabase } from './supabase';
import type { MechanicProfile, Rating, VerificationStatus } from './types';

export type NearbyMechanic = MechanicProfile & {
  distance_km: number;
  eta_minutes: number;
};

export async function listApprovedMechanics() {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profiles:user_id(full_name, phone, avatar_url)')
    .eq('verification_status', 'approved')
    .eq('is_available', true);
  return { mechanics: (data ?? []) as MechanicProfile[], error: error?.message ?? null };
}

export async function getNearbyMechanics(
  lat?: number | null,
  lng?: number | null,
  maxKm = 50
): Promise<{ mechanics: NearbyMechanic[]; error: string | null }> {
  const { mechanics, error } = await listApprovedMechanics();
  if (error) return { mechanics: [], error };

  const validMechanics = mechanics.filter(
    (m) =>
      m.latitude != null &&
      m.longitude != null &&
      !isNaN(Number(m.latitude)) &&
      !isNaN(Number(m.longitude))
  );

  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return {
      mechanics: validMechanics.map((m) => ({
        ...m,
        distance_km: 0,
        eta_minutes: 0,
      })),
      error: null,
    };
  }

  const nearby = validMechanics
    .map((m) => {
      const distance_km = distanceKm(lat, lng, Number(m.latitude), Number(m.longitude));
      return {
        ...m,
        distance_km,
        eta_minutes: etaMinutesFromDistance(distance_km),
      };
    })
    .filter((m) => m.distance_km <= Math.max(maxKm, m.service_radius_km || 15))
    .sort((a, b) => a.distance_km - b.distance_km);

  return { mechanics: nearby, error: null };
}

export async function getMechanicProfile(userId: string) {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profiles:user_id(full_name, phone, avatar_url)')
    .eq('user_id', userId)
    .maybeSingle();
  return { mechanic: data as MechanicProfile | null, error: error?.message ?? null };
}

export async function updateMechanicProfile(
  userId: string,
  patch: Partial<
    Pick<
      MechanicProfile,
      | 'workshop_name'
      | 'specialties'
      | 'experience_years'
      | 'service_radius_km'
      | 'working_hours'
      | 'is_available'
      | 'latitude'
      | 'longitude'
      | 'bio'
    >
  >
) {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*, profiles:user_id(full_name, phone, avatar_url)')
    .single();
  return { mechanic: data as MechanicProfile | null, error: error?.message ?? null };
}

export async function listPendingVerifications() {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profiles:user_id(full_name, phone, avatar_url)')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: true });
  return { mechanics: (data ?? []) as MechanicProfile[], error: error?.message ?? null };
}

export async function listMechanicsByVerificationStatus() {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profiles:user_id(full_name, phone, avatar_url)')
    .order('created_at', { ascending: false });
  return { mechanics: (data ?? []) as MechanicProfile[], error: error?.message ?? null };
}

export async function setVerificationStatus(
  userId: string,
  verification_status: VerificationStatus
) {
  const { error } = await supabase
    .from('mechanic_profiles')
    .update({ verification_status, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function listMechanicRatings(mechanicId: string) {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  return { ratings: (data ?? []) as Rating[], error: error?.message ?? null };
}
