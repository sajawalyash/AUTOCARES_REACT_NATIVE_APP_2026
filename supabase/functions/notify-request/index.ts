type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
const runtime = (globalThis as typeof globalThis & { Deno: DenoRuntime }).Deno;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type PushPayload = {
  requestId: string;
  mechanicId: string;
  customerId?: string;
  title?: string;
  body?: string;
  vehicleType?: string;
  problemType?: string;
  distanceKm?: number | null;
  customerName?: string | null;
  isSos?: boolean;
};

runtime.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const projectUrl = runtime.env.get('SUPABASE_URL');
  const serviceKey =
    runtime.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    runtime.env.get('SUPABASE_ANON_KEY') ??
    runtime.env.get('SUPABASE_PUBLISHABLE_KEY');

  if (!authorization?.startsWith('Bearer ') || !projectUrl || !serviceKey) {
    return jsonResponse({ error: 'Unauthorized. Authentication required.' }, 401);
  }

  let body: PushPayload;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const {
    requestId,
    mechanicId,
    customerId,
    title,
    body: messageBody,
    vehicleType,
    problemType,
    distanceKm,
    customerName,
    isSos,
  } = body;

  if (!requestId || !mechanicId) {
    return jsonResponse({ error: 'requestId and mechanicId are required.' }, 400);
  }

  try {
    // 1. Fetch mechanic push tokens using Supabase REST API
    const tokensRes = await fetch(
      `${projectUrl}/rest/v1/user_push_tokens?user_id=eq.${encodeURIComponent(mechanicId)}&select=push_token,platform`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokensRes.ok) {
      const errText = await tokensRes.text();
      return jsonResponse({ error: `Failed to fetch mechanic push tokens: ${errText}` }, 500);
    }

    const tokens: Array<{ push_token: string; platform: string }> = await tokensRes.json();

    if (!tokens || tokens.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No push tokens registered for this mechanic.',
        sentCount: 0,
      });
    }

    // 2. Prepare notifications for Expo Push Service
    const defaultTitle = isSos
      ? '🚨 Emergency SOS Roadside Assistance!'
      : '🚗 New Assistance Request!';

    const distancePart =
      typeof distanceKm === 'number'
        ? distanceKm < 1
          ? ` · ${Math.round(distanceKm * 1000)} m away`
          : ` · ${distanceKm.toFixed(1)} km away`
        : '';

    const defaultBody =
      messageBody ||
      (customerName
        ? `${customerName} needs ${vehicleType || 'vehicle'} assistance${distancePart}`
        : `A customer nearby needs your help${distancePart}. Tap to view.`);

    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: 'request_alert.wav',
      title: title || defaultTitle,
      body: defaultBody,
      channelId: 'autocares_mechanic_requests',
      priority: 'high',
      _displayInForeground: true,
      data: {
        requestId,
        customerId,
        vehicleType,
        problemType,
        isSos: !!isSos,
        channelId: 'autocares_mechanic_requests',
      },
    }));

    // 3. Dispatch to Expo Push API
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoRes.json();

    return jsonResponse({
      success: true,
      sentCount: messages.length,
      expoResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
