import { supabase } from './supabase';
import type { MechanicType, VehicleType } from './types';

export const STRICT_RESTRICTION_MESSAGE =
  'I am designed specifically to help with vehicle breakdowns and troubleshooting. I can only assist with vehicle-related problems. Thank you for your understanding.';

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

export type QueryClassification =
  | { type: 'unrelated' }
  | { type: 'vehicle'; sanitizedPrompt?: string }
  | { type: 'mixed'; vehiclePart: string }
  | { type: 'ambiguous' };

// 1. Unrelated patterns (trivia, coding, math, entertainment, personal, prompt injection)
export const UNRELATED_PATTERNS = [
  // Math & calculations
  /\b\d+\s*[\+\-\*\/]\s*\d+\b/i,
  /\b(what\s+is|solve|calculate|evaluate)\s+\d+/i,
  /\b(math|mathematics|calculus|algebra|equation|geometry)\b/i,

  // Programming & software development
  /\b(python|javascript|typescript|c\+\+|java|html|css|php|ruby|golang|rust|sql\s+query)\b/i,
  /\b(write|create|generate|debug)\s+(me\s+)?(a\s+)?(script|code|program|software|algorithm|function|app|website|bot)\b/i,
  /\b(coding|programming)\b/i,

  // Creative writing & entertainment
  /\b(tell\s+me|write|give\s+me)\s+(a\s+)?(joke|poem|poetry|story|song|lyrics|riddle)\b/i,
  /\b(funny\s+joke|comedy)\b/i,

  // General knowledge / trivia / geography / politics / news
  /\bcapital\s+of\b/i,
  /\b(who\s+is|who\s+was|who\s+won|who\s+lost)\b/i,
  /\b(president|prime\s+minister|politician|parliament|election|government)\b/i,
  /\b(latest\s+news|current\s+events|breaking\s+news|weather\s+forecast|weather\s+in)\b/i,
  /\b(history\s+of|population\s+of|currency\s+of|flag\s+of)\b/i,
  /\bexplain\s+(quantum|artificial\s+intelligence|machine\s+learning|crypto|bitcoin|nft|blockchain)\b/i,

  // Career / academic / personal advice
  /\b(cv|resume|job\s+application|cover\s+letter)\b/i,
  /\b(write|create|draft|review)\s+.*(cv|resume|job\s+application|cover\s+letter|essay|assignment)\b/i,
  /\b(homework|exam|quiz)\b/i,
  /\b(relationship|dating|love|marriage)\s+advice\b/i,
  /\b(recipe\s+for|how\s+to\s+cook|diet\s+plan|workout\s+routine)\b/i,

  // Sports & matches
  /\b(cricket|football|soccer|tennis|basketball|nba|ipl|psl|world\s+cup)\s*(match|score|update|game|team)?\b/i,

  // Prompt injection & role overrides
  /\b(ignore\s+(all\s+|your\s+|previous\s+)?instructions|you\s+are\s+now|pretend\s+(to\s+be|you\s+are)|system\s+prompt|reveal\s+(your\s+)?(prompt|key|instructions)|forget\s+your\s+(instructions|role))\b/i,
  /\b(dan\s+mode|jailbreak|developer\s+mode)\b/i,
];

// 2. Legitimate automotive / vehicle breakdown & troubleshooting patterns
export const VEHICLE_BREAKDOWN_PATTERNS = [
  /\b(won'?t\s+start|not\s+starting|start\s+problem|crank|no\s+crank|won'?t\s+turn\s+over|hard\s+start)\b/i,
  /\b(battery|dead\s+battery|jump\s*start|jumpstart|alternator|starter\s+motor|voltage|terminal)\b/i,
  /\b(overheat|overheating|temperature\s+(is\s+)?(high|rising|up)|coolant|radiator|antifreeze|water\s+pump)\b/i,
  /\b(flat\s+t[iy]re|t[iy]re|tire|puncture|blowout|spare\s+t[iy]re|jack|lug\s+nut|wheel|rim|tpms)\b/i,
  /\b(brake|brakes|braking|brake\s+fluid|brake\s+pad|pedal|spongy\s+pedal|abs|caliper|rotor)\b/i,
  /\b(engine|check\s+engine|misfire|stalled?|died\s+while|stopped\s+while|sputter|shudder|shaking|vibrat)\b/i,
  /\b(clutch|transmission|gear|gearbox|shifter|slipping\s+gear|won'?t\s+shift|reverse|drive)\b/i,
  /\b(smoke|smoking|steam|burning\s+smell|leak|leaking|dripping\s+fluid|oil\s+leak|fluid\s+leak)\b/i,
  /\b(clicking|ticking|grinding|squealing|squeaking|knocking|rattling|hissing|whining)\b/i,
  /\b(losing\s+power|loss\s+of\s+power|limp\s+mode|won'?t\s+move|stuck\s+on\s+the\s+road)\b/i,
  /\b(dashboard|warning\s+light|odometer|speedometer|fuel\s+gauge|temp\s+gauge|instrument\s+cluster)\b/i,
  /\b(fuel|gasoline|petrol|diesel|fuel\s+pump|fuel\s+filter|injector|carburetor|gas\s+tank)\b/i,
  /\b(kick\s*start|chain|throttle|handlebar|sprocket|spark\s+plug|ignition\s+coil)\b/i,
  /\b(roadside|breakdown|broke\s+down|stranded|towing|mechanic|assistance)\b/i,
  /\b(car|bike|motorcycle|scooter|van|vehicle|truck|automobile)\b/i,
];

// Patterns where vehicle words are used superficially in unrelated requests
export const SUPERFICIAL_VEHICLE_PATTERNS = [
  /\b(write|create|code|generate)\s+.*(script|program|code|algorithm|app|class|function).*about\s+(a\s+)?(car|bike|vehicle|motorcycle|scooter|van)/i,
  /\b(tell\s+me|write)\s+.*(joke|poem|story|song|essay).*about\s+(a\s+)?(car|bike|vehicle|motorcycle|scooter|van)/i,
  /\b(cv|resume|job\s+application).*for\s+(a\s+)?(mechanic|driver|car)/i,
];

/**
 * Classifies an incoming user prompt to guarantee strict domain restriction.
 */
export function classifyAssistantQuery(
  text: string,
  history?: AssistantMessage[]
): QueryClassification {
  const trimmed = text.trim();
  if (!trimmed) return { type: 'ambiguous' };

  // 1. Superficial vehicle keywords inside unrelated requests
  for (const pattern of SUPERFICIAL_VEHICLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'unrelated' };
    }
  }

  // 2. Check for mixed queries: legitimate vehicle breakdown + unrelated request
  const hasVehicle = VEHICLE_BREAKDOWN_PATTERNS.some((p) => p.test(trimmed));
  const hasUnrelated = UNRELATED_PATTERNS.some((p) => p.test(trimmed));

  if (hasVehicle && hasUnrelated) {
    const vehiclePart = extractVehiclePart(trimmed);
    if (vehiclePart && vehiclePart.length >= 5) {
      return { type: 'mixed', vehiclePart };
    }
    return { type: 'unrelated' };
  }

  // 3. Exclusively unrelated queries
  if (hasUnrelated) {
    return { type: 'unrelated' };
  }

  // 4. Exclusively vehicle-related queries
  if (hasVehicle) {
    return { type: 'vehicle', sanitizedPrompt: trimmed };
  }

  // 5. Contextual follow-up check:
  // If the conversation history is already vehicle-related, accept short follow-up answers/symptoms
  if (history && history.length > 0) {
    const hasPriorVehicleContext = history.some((m) =>
      VEHICLE_BREAKDOWN_PATTERNS.some((p) => p.test(m.text))
    );
    if (hasPriorVehicleContext) {
      const isContextualFollowup =
        /^(yes|no|yeah|nope|sure|ok|okay|neither|both)\b/i.test(trimmed) ||
        /\b(click|clicks|clicking|sound|noise|smoke|steam|leak|light|gauge|front|rear|left|right|hot|cold|under|pedal|gear|seconds|minutes|solid|blinking|flashing|stationary|moving)\b/i.test(
          trimmed
        ) ||
        trimmed.length < 80;

      if (isContextualFollowup) {
        return { type: 'vehicle', sanitizedPrompt: trimmed };
      }
    }
  }

  // 6. Ambiguous standalone query without vehicle context
  return { type: 'ambiguous' };
}

/**
 * Extracts only the vehicle breakdown portion from a mixed query.
 */
export function extractVehiclePart(text: string): string {
  const parts = text.split(/(?:\.|\?|!|\band\b|\balso\b|\bby the way\b|\bplus\b)/i);
  const vehicleParts = parts.filter(
    (part) =>
      VEHICLE_BREAKDOWN_PATTERNS.some((p) => p.test(part)) &&
      !UNRELATED_PATTERNS.some((p) => p.test(part))
  );
  return vehicleParts.join('. ').trim();
}

/**
 * Main AI guidance function with multi-layer domain protection.
 */
export async function getVehicleGuidance(input: {
  messages: AssistantMessage[];
  vehicle: VehicleContext;
  problemType: string;
  diagnostics?: ObdContext | null;
}): Promise<{ guidance: AiGuidance | null; error: string | null }> {
  const latestMessage = input.messages[input.messages.length - 1];
  const history = input.messages.slice(0, -1);
  const classification = classifyAssistantQuery(latestMessage?.text || '', history);

  // Layer 1: Client-side domain restriction enforcement
  if (classification.type === 'unrelated') {
    return {
      guidance: {
        summary: STRICT_RESTRICTION_MESSAGE,
        possible_causes: [],
        next_steps: [],
        urgency: 'low',
        safety_note: '',
        follow_up_question: null,
        recommend_mechanic: false,
      },
      error: null,
    };
  }

  // If mixed query: sanitize latest message to vehicle part only
  let sanitizedInput = input;
  if (classification.type === 'mixed' && classification.vehiclePart) {
    const updatedMessages = [...input.messages];
    updatedMessages[updatedMessages.length - 1] = {
      role: 'user',
      text: classification.vehiclePart,
    };
    sanitizedInput = {
      ...input,
      messages: updatedMessages,
    };
  }

  // Layer 2: Attempt Supabase Edge Function (Gemini API with secure server-side domain guard)
  try {
    const { data, error } = await supabase.functions.invoke('vehicle-assistant', {
      body: sanitizedInput,
      timeout: 12_000,
    });
    if (!error && isAiGuidance(data?.guidance)) {
      // Validate returned guidance
      if (
        data.guidance.summary === STRICT_RESTRICTION_MESSAGE ||
        data.guidance.summary.includes('designed specifically to help with vehicle')
      ) {
        return {
          guidance: {
            summary: STRICT_RESTRICTION_MESSAGE,
            possible_causes: [],
            next_steps: [],
            urgency: 'low',
            safety_note: '',
            follow_up_question: null,
            recommend_mechanic: false,
          },
          error: null,
        };
      }
      return { guidance: data.guidance, error: null };
    }
  } catch {
    // Edge function unreachable; fall through to intelligent local automotive diagnostic engine
  }

  // Layer 3: Intelligent Local Automotive Diagnostic Engine fallback
  try {
    const localGuidance = generateLocalGuidance(sanitizedInput);
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
export function generateLocalGuidance(input: {
  messages: AssistantMessage[];
  vehicle: VehicleContext;
  problemType: string;
  diagnostics?: ObdContext | null;
}): AiGuidance {
  const latestMessage = input.messages[input.messages.length - 1];
  const history = input.messages.slice(0, -1);
  const classification = classifyAssistantQuery(latestMessage?.text || '', history);

  // Domain guard
  if (classification.type === 'unrelated') {
    return {
      summary: STRICT_RESTRICTION_MESSAGE,
      possible_causes: [],
      next_steps: [],
      urgency: 'low',
      safety_note: '',
      follow_up_question: null,
      recommend_mechanic: false,
    };
  }

  // Ambiguous query guard
  if (classification.type === 'ambiguous') {
    return {
      summary:
        'Please describe the problem your vehicle is experiencing (e.g., won\'t start, engine overheating, flat tire, clicking noise, dashboard warning light), and I will guide you with safe roadside troubleshooting steps.',
      possible_causes: [],
      next_steps: [
        'Describe the exact symptom or noise you noticed.',
        'Mention if any dashboard warning lights are illuminated.',
        'Let me know if you are safely stopped on the roadside.',
      ],
      urgency: 'low',
      safety_note:
        'If you are stopped on an active road or highway, please ensure your hazard warning lights are on and you are in a safe location.',
      follow_up_question: 'What symptoms or warning signs did you observe?',
      recommend_mechanic: false,
    };
  }

  const userText = input.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text.toLowerCase())
    .join(' ');

  const problem = (input.problemType || '').toLowerCase();
  const vType = input.vehicle.vehicle_type;
  const vehicleDesc = `${input.vehicle.year ? input.vehicle.year + ' ' : ''}${
    input.vehicle.make || ''
  } ${input.vehicle.model || vType}`.trim();

  const obdCodes = input.diagnostics?.codes?.map((c) => c.code.toUpperCase()) ?? [];

  // DANGEROUS ROAD EMERGENCY: Severe Brakes, Fuel Leak, Smoke / Fire
  if (
    /\b(fuel\s+leak|gasoline\s+leak|leaking\s+gas|fuel\s+smell|smell\s+of\s+gas)\b/i.test(userText) ||
    /\b(smoke|smoking\s+heavily|engine\s+fire|burning\s+wire)\b/i.test(userText) ||
    /\bbrake\b.{0,30}\b(failed|failure|not\s+working|gone|pedal\s+to\s+floor)\b/i.test(userText)
  ) {
    return {
      summary: `EMERGENCY ROADSIDE ALERT: Critical safety hazard detected on your ${vehicleDesc}. Immediate action is required to avoid collision, fire, or injury.`,
      possible_causes: [
        'Ruptured pressurized fuel line, injector seal, or tank puncture',
        'Complete hydraulic brake circuit loss (blown brake hose or master cylinder failure)',
        'Electrical short-circuit or burning fluid spraying onto hot exhaust manifold',
      ],
      next_steps: [
        'Bring the vehicle to a controlled stop immediately away from moving traffic.',
        'Turn off the ignition switch to cut electrical power and fuel pump pressure.',
        'Evacuate all passengers to a safe location behind the highway guardrail or off the road.',
        'Do NOT crank the engine or open the hood if dense smoke or flame is visible.',
        'Request emergency roadside assistance or emergency services immediately.',
      ],
      urgency: 'high',
      safety_note:
        'CRITICAL SAFETY WARNING: Do NOT attempt roadside repair. Fuel leaks and active smoke present extreme fire and collision risks.',
      follow_up_question: null,
      recommend_mechanic: true,
    };
  }

  // 1. OVERHEATING / TEMPERATURE / STEAM
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
        'Stuck-closed thermostat preventing coolant circulation',
        'Inoperative electric radiator cooling fan or blown fuse',
        'Broken serpentine / water pump drive belt',
        'Clogged radiator core fins blocking airflow',
      ],
      next_steps: [
        'Pull over safely away from traffic and turn off engine immediately.',
        'Wait at least 25 to 30 minutes for the engine to cool down before opening the hood.',
        'Inspect the ground under the engine bay for dripping pink or green coolant.',
        'Check the transparent plastic coolant reservoir once cool; add 50/50 coolant or clean water if empty.',
        'Request a verified mechanic if the temperature rises again immediately upon restart.',
      ],
      urgency: 'high',
      safety_note:
        'CRITICAL: Never open the radiator or expansion tank cap while the engine is hot. Pressurized boiling coolant will spray out and cause severe burn injuries.',
      follow_up_question:
        'Did the temperature spike suddenly or creep up in traffic, and do you see steam or coolant leaking?',
      recommend_mechanic: true,
    };
  }

  // 2. MOTORCYCLE / BIKE / SCOOTER SPECIFIC
  if (
    (vType === 'Bike' || vType === 'Scooter') &&
    (userText.includes('kick') ||
      userText.includes('chain') ||
      userText.includes('sprocket') ||
      userText.includes('stopped while') ||
      userText.includes('riding') ||
      userText.includes('scooter') ||
      userText.includes('bike'))
  ) {
    return {
      summary: `Two-wheeler roadside issue analyzed for your ${vehicleDesc}. Engine stopped or drive mechanism interrupted during operation.`,
      possible_causes: [
        'Faulty or fouled spark plug / loosened spark plug cap',
        'Fuel starvation: clogged fuel petcock filter or empty tank',
        'Safety side-stand switch sensor engaged or corroded',
        'Dead 12V motorcycle battery or faulty CDI / stator coil',
        'Drive chain slipped, loose, or broken (or CVT belt on scooter)',
      ],
      next_steps: [
        'Push the bike safely onto the shoulder away from traffic and deploy the center stand.',
        'Ensure the handlebar engine kill-switch is in the "RUN" position and side-stand is fully retracted.',
        'Check fuel petcock: switch to "RESERVE" if fuel level is low.',
        'Inspect spark plug boot: ensure it is firmly snapped onto the spark plug terminal.',
        'If kickstarting: check for normal compression resistance.',
      ],
      urgency: 'medium',
      safety_note:
        'Ensure you are standing on the safe shoulder side of the motorcycle away from passing traffic.',
      follow_up_question:
        'Does the starter crank at all, or did the engine cut out completely while riding?',
      recommend_mechanic: true,
    };
  }

  // 3. DEAD BATTERY / NO START / CLICKING
  if (
    problem.includes('battery') ||
    userText.includes('battery') ||
    userText.includes('wont start') ||
    userText.includes("won't start") ||
    userText.includes('not start') ||
    userText.includes('click') ||
    userText.includes('crank') ||
    userText.includes('jump') ||
    userText.includes('alternator') ||
    userText.includes('dead')
  ) {
    return {
      summary: `Starting or electrical power fault diagnosed for your ${vehicleDesc}. The engine is not receiving adequate cranking amperage to turn over.`,
      possible_causes: [
        'Discharged or degraded 12V vehicle battery',
        'Corroded (white/blue residue) or loose battery terminal clamps',
        'Failing starter motor solenoid or worn brushes',
        'Alternator charging failure (battery drained while driving)',
        'Immobilizer / smart key fob battery depleted',
      ],
      next_steps: [
        'Observe instrument cluster: do lights turn off or dim completely when turning the key?',
        'Listen for starter sound: rapid clicking indicates low battery voltage; total silence indicates connection/starter fault.',
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

  // 4. FLAT TIRE / WHEEL / PUNCTURE
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

  // 5. BRAKES / SQUEALING / SOFT PEDAL
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

  // 6. ENGINE ISSUE / CHECK ENGINE LIGHT / MISFIRE
  if (
    problem.includes('engine') ||
    userText.includes('engine') ||
    userText.includes('misfire') ||
    userText.includes('check engine') ||
    userText.includes('shake') ||
    userText.includes('shudder') ||
    userText.includes('stall') ||
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
      urgency: userText.includes('flashing') ? 'high' : 'medium',
      safety_note:
        'A flashing Check Engine light indicates active raw fuel dumping into the exhaust, which can destroy the catalytic converter within minutes or trigger an engine bay fire.',
      follow_up_question:
        'Is the Check Engine light solid or blinking, and does the vehicle shake at idle or when accelerating?',
      recommend_mechanic: true,
    };
  }

  // 7. TRANSMISSION / GEARS / CLUTCH
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

  // 8. GENERAL ROADSIDE GUIDANCE (Tailored to vehicle)
  return {
    summary: `Roadside assessment for your ${vehicleDesc} regarding: "${latestMessage?.text || input.problemType}".`,
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
