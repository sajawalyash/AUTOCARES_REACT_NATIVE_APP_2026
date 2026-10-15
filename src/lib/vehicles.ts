import { supabase } from './supabase';
import type { Vehicle, VehicleDiagnostic } from './types';

export async function listVehicles(customerId: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return { vehicles: (data ?? []) as Vehicle[], error: error?.message ?? null };
}

export async function createVehicle(
  input: Omit<Vehicle, 'id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(input)
    .select('*')
    .single();
  return { vehicle: data as Vehicle | null, error: error?.message ?? null };
}

export async function updateVehicle(
  id: string,
  patch: Partial<Omit<Vehicle, 'id' | 'customer_id' | 'created_at'>>
) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return { vehicle: data as Vehicle | null, error: error?.message ?? null };
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function listDiagnostics(vehicleId: string) {
  const { data, error } = await supabase
    .from('vehicle_diagnostics')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('recorded_at', { ascending: false });
  return { diagnostics: (data ?? []) as VehicleDiagnostic[], error: error?.message ?? null };
}

export async function addDiagnostic(input: {
  vehicle_id: string;
  code?: string;
  description: string;
}) {
  const { data, error } = await supabase
    .from('vehicle_diagnostics')
    .insert(input)
    .select('*')
    .single();
  return { diagnostic: data as VehicleDiagnostic | null, error: error?.message ?? null };
}
