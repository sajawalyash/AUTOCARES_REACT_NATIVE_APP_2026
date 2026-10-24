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
  // 1. Attempt Supabase Edge Function if available
  try {
    const { data, error } = await supabase.functions.invoke('vehicle-assistant', {
      body: input,
      timeout: 10_000,
    });
    if (!error && isAiGuidance(data?.guidance)) {
      return { guidance: data.guidance, error: null };
    }
  } catch {
    // Edge function not reachable, fall through to intelligent local automotive diagnostic engine
  }

  // 2. Fallback to Local Automotive Diagnostic Engine
  try {
    const localGuidance = generateLocalGuidance(input);
    return { guidance: localGuidance, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Please retry.';
    return { guidance: null, error: `Vehicle assistant could not process query: ${message}` };
  }
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

/**
 * Intelligent Automotive Diagnostic Rules Engine
 * Provides immediate roadside troubleshooting when remote edge functions are unreachable.
 */
function generateLocalGuidance(input: {
  messages: AssistantMessage[];
  vehicle: VehicleContext;
  problemType: string;
  diagnostics?: ObdContext | null;
}): AiGuidance {
  const userText = input.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text.toLowerCase())
    .join(' ');

  const problem = (input.problemType || '').toLowerCase();
  const vehicleDesc = `${input.vehicle.year ? input.vehicle.year + ' ' : ''}${input.vehicle.make || ''} ${input.vehicle.model || input.vehicle.vehicle_type}`.trim();

  // Check OBD-II codes if present
  const obdCodes = input.diagnostics?.codes?.map((c) => c.code.toUpperCase()) ?? [];

  // 1. OVERHEATING
  if (
    problem.includes('overheat') ||
    userText.includes('overheat') ||
    userText.includes('steam') ||
    userText.includes('boil') ||
    userText.includes('hot') ||
    userText.includes('coolant') ||
    userText.includes('temp gauge') ||
    obdCodes.some((c) => c.startsWith('P011') || c.startsWith('P021'))
  ) {
    return {
      summary: `High coolant temperature or overheating detected on your ${vehicleDesc}. Continued driving risks warping the cylinder head or blowing the head gasket.`,
      possible_causes: [
        'Low coolant level from radiator, hose, or water pump leak',
        'Stuck-closed thermostat preventing coolant flow',
        'Inoperative electric radiator cooling fan or blown fuse',
        'Broken serpentine / water pump drive belt',
        'Clogged radiator core fins blocking airflow',
      ],
      next_steps: [
        'Pull over safely away from traffic and turn off engine immediately.',
        'Wait at least 25 to 30 minutes for the engine to cool before touching anything.',
        'Inspect the ground under the engine bay for dripping pink or green coolant.',
        'Check the transparent plastic coolant reservoir once cool; add 50/50 coolant or clean water if empty.',
        'Request a verified mechanic if the temperature rises again immediately upon restart.',
      ],
      urgency: 'high',
      safety_note:
        'CRITICAL: Never open the radiator or expansion tank cap while the engine is hot. Pressurized boiling coolant will spray out and cause severe burn injuries.',
      follow_up_question:
        'Did the temperature spike suddenly or creep up in traffic, and do you hear boiling or hissing from under the hood?',
      recommend_mechanic: true,
    };
  }

  // 2. DEAD BATTERY / NO START / CLICKING
  if (
    problem.includes('battery') ||
    userText.includes('battery') ||
    userText.includes('wont start') ||
    userText.includes("won't start") ||
    userText.includes('click') ||
    userText.includes('crank') ||
    userText.includes('jump') ||
    userText.includes('alternator') ||
    userText.includes('dead')
  ) {
    return {
      summary: `Starting or electrical power fault diagnosed for your ${vehicleDesc}. The engine is not receiving adequate cranking amperage to turn over.`,
      possible_causes: [
        'Discharged or degraded 12V lead-acid battery',
        'Corroded (white/blue residue) or loose battery terminal clamps',
        'Failing starter motor solenoid or worn brushes',
        'Alternator charging failure (battery drained while driving)',
        'Immobilizer / smart key fob battery depleted',
      ],
      next_steps: [
        'Observe instrument cluster: do lights turn off or dim completely when turning the key?',
        'Listen for starter sound: rapid clicking indicates low voltage; total silence indicates connection/starter fault.',
        'Inspect battery terminals for loose connections or corrosion powder.',
        'Perform a jump-start using booster cables or a portable lithium jump pack.',
        'If the vehicle jumps but dies shortly after removing cables, replace or test the alternator.',
      ],
      urgency: 'medium',
      safety_note:
        'When connecting jumper cables: connect Red to (+), Black to (-) or unpainted chassis ground. Never let the red and black clamp jaws touch while connected.',
      follow_up_question:
        'Do you hear a rapid clicking sound, a single loud click, or complete silence when attempting to crank?',
      recommend_mechanic: true,
    };
  }

  // 3. FLAT TIRE / WHEEL / PUNCTURE
  if (
    problem.includes('tire') ||
    userText.includes('tire') ||
    userText.includes('tyre') ||
    userText.includes('flat') ||
    userText.includes('puncture') ||
    userText.includes('blowout') ||
    userText.includes('tpms')
  ) {
    return {
      summary: `Tire deflation or puncture identified on your ${vehicleDesc}. Driving on a flat tire damages the alloy rim, destroys the tire sidewall, and compromises vehicle control.`,
      possible_causes: [
        'Nail, screw, or road debris penetrating tire tread',
        'Damaged or leaking tire valve stem or core',
        'Bead seal leak between tire and wheel rim lip',
        'Sidewall impact puncture or pothole pinch flat',
      ],
      next_steps: [
        'Slow down smoothly and steer to a firm, flat, level shoulder away from traffic.',
        'Engage hazard warning lights and firmly apply the parking brake.',
        'Place wheel chocks or heavy rocks behind the wheels opposite the flat tire.',
        'Loosen lug nuts slightly before jacking the vehicle up at the reinforced chassis lift point.',
        'Mount the spare tire, hand-tighten lugs in a star pattern, lower the car, and torque firmly.',
      ],
      urgency: 'high',
      safety_note:
        'Never place any part of your body underneath a vehicle supported only by a jack. Never change a tire on a slope or with traffic passing closely.',
      follow_up_question:
        'Are you on flat level ground, and do you have a spare tire, working jack, and lug wrench available?',
      recommend_mechanic: false,
    };
  }

  // 4. BRAKES / SQUEALING / SOFT PEDAL
  if (
    userText.includes('brake') ||
    userText.includes('pedal') ||
    userText.includes('grind') ||
    userText.includes('squeal') ||
    userText.includes('abs') ||
    userText.includes('spongy')
  ) {
    return {
      summary: `Braking system malfunction or wear detected on your ${vehicleDesc}. Braking safety is critical; stopping distance is compromised.`,
      possible_causes: [
        'Brake friction pads worn down to metal wear indicator or backing plate',
        'Air bubbles trapped inside hydraulic brake lines causing spongy pedal',
        'Low brake fluid level from caliper, wheel cylinder, or hose leak',
        'Warped brake disc rotors causing pedal vibration/pulsation',
      ],
      next_steps: [
        'Test brake pedal feel while safely stationary: pedal must feel firm and not sink toward floorboard.',
        'Check brake fluid reservoir under hood: fluid should be between MIN and MAX marks.',
        'If the pedal sinks to the floor or brake warning light is on, do NOT drive the vehicle.',
        'Dispatch an on-site mechanic or arrange flatbed transport for safe brake inspection.',
      ],
      urgency: 'high',
      safety_note:
        'WARNING: Driving with compromised brakes poses an extreme collision risk. Pull over safely and do not continue your journey if pedal pressure is lost.',
      follow_up_question:
        'Does the brake pedal sink to the floor, or is there a loud metallic grinding sound when stopping?',
      recommend_mechanic: true,
    };
  }

  // 5. ENGINE ISSUE / CHECK ENGINE LIGHT / MISFIRE
  if (
    problem.includes('engine') ||
    userText.includes('engine') ||
    userText.includes('misfire') ||
    userText.includes('check engine') ||
    userText.includes('shake') ||
    userText.includes('shudder') ||
    userText.includes('stall') ||
    userText.includes('smoke') ||
    obdCodes.some((c) => c.startsWith('P03') || c.startsWith('P04') || c.startsWith('P01'))
  ) {
    const obdNote = obdCodes.length > 0 ? ` (DTC detected: ${obdCodes.join(', ')})` : '';
    return {
      summary: `Engine performance fault or misfire analyzed for your ${vehicleDesc}${obdNote}. Fuel combustion or air intake is operating outside normal parameters.`,
      possible_causes: [
        'Failing spark plug or cracked ignition coil causing cylinder misfire',
        'Dirty Mass Airflow (MAF) sensor or sticky throttle body valve',
        'Vacuum leak in intake manifold or PCV breather hoses',
        'Clogged fuel filter or weak fuel pump delivering low rail pressure',
        'Faulty upstream oxygen (O2) sensor or catalytic converter restriction',
      ],
      next_steps: [
        'Observe Check Engine indicator: if it is steady, drive gently at low RPM to a repair facility.',
        'If Check Engine indicator is FLASHING: pull over and turn off engine immediately.',
        'Inspect air intake hoses for loose clamps, cracks, or disconnected vacuum lines.',
        'Connect OBD-II adapter to scan confirmed and pending trouble codes.',
        'Avoid heavy throttle acceleration or high speed highway driving.',
      ],
      urgency: userText.includes('flashing') || userText.includes('smoke') ? 'high' : 'medium',
      safety_note:
        'A flashing Check Engine light indicates active raw fuel dumping into the exhaust, which can destroy the catalytic converter within minutes or trigger an engine bay fire.',
      follow_up_question:
        'Is the Check Engine light solid or blinking, and does the vehicle shake at idle or when accelerating?',
      recommend_mechanic: true,
    };
  }

  // 6. TRANSMISSION / GEARS / CLUTCH
  if (
    userText.includes('gear') ||
    userText.includes('transmission') ||
    userText.includes('clutch') ||
    userText.includes('shift') ||
    userText.includes('slip') ||
    userText.includes('reverse')
  ) {
    return {
      summary: `Drivetrain / transmission issue diagnosed on your ${vehicleDesc}. Power transfer from the engine to the drive wheels is slipping or disconnected.`,
      possible_causes: [
        'Low or degraded Automatic Transmission Fluid (ATF)',
        'Worn manual clutch disc friction lining or leaking slave cylinder',
        'Faulty transmission shift solenoid or valve body pressure leak',
        'Broken shift linkage cable or selector switch misalignment',
      ],
      next_steps: [
        'Check transmission fluid level via dipstick (if equipped) while idling on level ground.',
        'Fluid should be clean reddish/pink; dark brown or burnt smell indicates internal clutch wear.',
        'If manual: check if clutch pedal has resistance or stays stuck on the floor.',
        'Avoid revving the engine while slipping, as excessive heat will burn the gear pack.',
      ],
      urgency: 'high',
      safety_note:
        'Never tow an automatic or all-wheel-drive vehicle with the drive wheels on the ground. Always specify a flatbed tow truck.',
      follow_up_question:
        'Does the engine rev high without the car moving forward, or does the shifter feel completely loose?',
      recommend_mechanic: true,
    };
  }

  // 7. GENERAL ROADSIDE GUIDANCE (Tailored to vehicle)
  return {
    summary: `Roadside assessment for your ${vehicleDesc} regarding: "${input.messages[input.messages.length - 1]?.text || input.problemType}".`,
    possible_causes: [
      'Component wear or loose electrical harness connection',
      'Fluid level discrepancy (coolant, oil, brake, or transmission fluid)',
      'Sensor calibration variance or pending diagnostic trouble code',
      'Environmental or road condition impact on chassis or suspension',
    ],
    next_steps: [
      'Ensure the vehicle is stationary in a safe location with hazard lights turned on.',
      'Perform a visual walk-around inspection for fluid leaks, smells, or physical damage.',
      'Check dashboard warning indicators for any illuminated symbol icons.',
      'If you have an OBD-II scanner, tap "Connect OBD-II" above to pull live diagnostic trouble codes.',
      'Request immediate dispatch from a nearby certified AutoCares mechanic if unresolved.',
    ],
    urgency: 'medium',
    safety_note:
      'Prioritize personal safety: remain inside the vehicle with seatbelts fastened if stopped on a high-speed highway shoulder, or step behind roadside crash barriers.',
    follow_up_question:
      'Can you describe any strange sounds (clicking, whining, grinding), smells, or visual warning lights you notice?',
    recommend_mechanic: true,
  };
}

export const MECHANIC_TYPE_FOR_VEHICLE: Record<VehicleType, MechanicType> = {
  Car: 'Car Mechanic',
  Van: 'Car Mechanic',
  Bike: 'Bike Mechanic',
  Scooter: 'Bike Mechanic',
};
