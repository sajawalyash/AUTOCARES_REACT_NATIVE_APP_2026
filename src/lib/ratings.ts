import { supabase } from './supabase';
import type { Rating } from './types';

export async function createRating(input: {
  request_id: string;
  customer_id: string;
  mechanic_id: string;
  stars: number;
  comment?: string;
}) {
  const { data, error } = await supabase
    .from('ratings')
    .insert(input)
    .select('*')
    .single();
  return { rating: data as Rating | null, error: error?.message ?? null };
}

export async function getRatingForRequest(requestId: string) {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();
  return { rating: data as Rating | null, error: error?.message ?? null };
}
