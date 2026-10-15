import { supabase } from './supabase';
import type { MechanicType, VehicleType } from './types';

export type AiGuidance = {
  summary: string;
  possible_causes: string[];
  next_steps: string[];
  urgency: 'low' | 'medium' | 'high';
  safety_note: string;
  follow_up_question: string | null;
  recommend_mechanic: boolean;
};

export type AssistantMessage = {
  role: 'user' | 'model';
  text: string;
};

export type VehicleContext = {
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number | null;
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'other' | null;
};

export type ObdContext = {
  source: 'connected_adapter';
  captured_at: string;
  readings: { pid: string; name: string; value: number; unit: string }[];
  codes: { code: string; status: 'stored' | 'pending' | 'permanent' }[];
};

export async function getVehicleGuidance(input: {
  messages: AssistantMessage[];
  vehicle: VehicleContext;
  problemType: string;
  diagnostics?: ObdContext | null;
}): Promise<{ guidance: AiGuidance | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('vehicle-assistant', {
    body: input,
    timeout: 35_000,
  });
  if (error) {
    if (error.context instanceof Response) {
      try {
        const body = (await error.context.json()) as { error?: string };
        if (body.error) return { guidance: null, error: body.error };
      } catch {
        // Use the SDK error below if the server did not return JSON.
      }
    }
    return { guidance: null, error: `Vehicle assistant is unavailable: ${error.message}` };
  }
  if (!isAiGuidance(data?.guidance)) {
    return { guidance: null, error: 'The vehicle assistant returned an invalid response. Please retry.' };
  }
  return { guidance: data.guidance, error: null };
}

function isAiGuidance(value: unknown): value is AiGuidance {
  if (!value || typeof value !== 'object') return false;
  const guidance = value as Record<string, unknown>;
  const shortStringArray = (items: unknown): items is string[] =>
    Array.isArray(items) &&
    items.length <= 8 &&
    items.every((item) => typeof item === 'string' && item.length <= 300);
  return (
    typeof guidance.summary === 'string' &&
    guidance.summary.length <= 1000 &&
    shortStringArray(guidance.possible_causes) &&
    shortStringArray(guidance.next_steps) &&
    (guidance.urgency === 'low' ||
      guidance.urgency === 'medium' ||
      guidance.urgency === 'high') &&
    typeof guidance.safety_note === 'string' &&
    guidance.safety_note.length <= 500 &&
    (typeof guidance.follow_up_question === 'string' ||
      guidance.follow_up_question === null) &&
    (typeof guidance.follow_up_question !== 'string' ||
      guidance.follow_up_question.length <= 300) &&
    typeof guidance.recommend_mechanic === 'boolean'
  );
}

export const MECHANIC_TYPE_FOR_VEHICLE: Record<VehicleType, MechanicType> = {
  Car: 'Car Mechanic',
  Van: 'Car Mechanic',
  Bike: 'Bike Mechanic',
  Scooter: 'Bike Mechanic',
};
