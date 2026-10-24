import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://finances.jhamal16.workers.dev',
  'https://finances.ajdapp.org',
  'https://finance.ajdapp.org',
]);
const defaultAllowedHeaders = 'authorization, x-client-info, apikey, content-type, x-supabase-api-version';
const validRequestedHeader = /^[a-z0-9!#$%&'*+.^_`|~-]+$/;

function headersFor(req: Request): Headers {
  const origin = req.headers.get('origin') || '';
  const headers = new Headers({
    'Vary': 'Origin, Access-Control-Request-Headers',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  });
  if (allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    // SDK versions add request headers over time. Match the browser's actual
    // preflight header request for trusted finance origins only.
    const requested = (req.headers.get('access-control-request-headers') || '')
      .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const safe = requested.length && requested.every(x => validRequestedHeader.test(x));
    headers.set('Access-Control-Allow-Headers', safe ? requested.join(', ') : defaultAllowedHeaders);
    headers.set('Access-Control-Max-Age', '3600');
  }
  return headers;
}

function reply(req: Request, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: headersFor(req) });
}
async function fingerprint(s: string): Promise<string> {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(dig), n => n.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.has(origin)) return reply(req, 'Request not allowed.', 403);
  if (req.method === 'OPTIONS') {
    const headers = headersFor(req);
    headers.delete('Content-Type');
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') return reply(req, 'Method not allowed.', 405);

  let username = '', password = '';
  try {
    const body = await req.json();
    username = String(body?.username || '').trim().toLowerCase();
    password = String(body?.password || '');
  } catch { return reply(req, 'Invalid request.', 400); }
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(username) || !password || password.length > 1024)
    return reply(req, 'Invalid username or password.', 401);

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('FINANCE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_tRjMtsoo9aT-6n7dzj9p-w_HsUqJ520';
  if (!url || !service) {
    console.error('Username sign-in unavailable: missing configured server credential.');
    return reply(req, 'Username sign-in temporarily unavailable. Sign in with your email instead.', 503);
  }

  try {
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const address = req.headers.get('cf-connecting-ip')
      || (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    for (const value of [await fingerprint('ip:'+address), await fingerprint('username:'+username)]) {
      const { data, error } = await admin.rpc('finance_username_login_rate_limit', { p_fingerprint: value });
      if (error) {
        console.error('Username sign-in rate limiter unavailable:', error.code || 'db-error');
        return reply(req, 'Username sign-in temporarily unavailable. Sign in with your email instead.', 503);
      }
      if (data !== true) return reply(req, 'Too many attempts. Try again in 15 minutes.', 429);
    }

    const { data: profile, error: findError } = await admin.from('finance_profiles')
      .select('user_id').eq('username', username).maybeSingle();
    if (findError) {
      console.error('Username profile lookup unavailable:', findError.code || 'db-error');
      return reply(req, 'Username sign-in temporarily unavailable. Sign in with your email instead.', 503);
    }
    if (!profile?.user_id) return reply(req, 'Invalid username or password.', 401);
    const { data: user, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    if (userError || !user?.user?.email) return reply(req, 'Invalid username or password.', 401);

    const client = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: loginError } = await client.auth.signInWithPassword({
      email: user.user.email, password,
    });
    if (loginError || !auth?.session) return reply(req, 'Invalid username or password.', 401);
    return new Response(JSON.stringify({
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
    }), { status: 200, headers: headersFor(req) });
  } catch (e) {
    console.error('Username login handler error:', e instanceof Error ? e.name : 'unknown');
    return reply(req, 'Username sign-in temporarily unavailable. Sign in with your email instead.', 503);
  }
});
