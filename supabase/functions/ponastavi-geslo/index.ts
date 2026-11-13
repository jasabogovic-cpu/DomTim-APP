// Pisarna nastavi zaposlenemu novo začasno geslo (ko ga pozabi).
// Kliče ga prijavljen uporabnik z vlogo vodja/pisarna: { uporabnik_id } → { geslo }
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const odg = (x: unknown, status = 200) => Response.json(x, { status, headers: CORS });

function novoGeslo() {
  const crke = 'abcdefghjkmnpqrstuvwxyz';
  const r = crypto.getRandomValues(new Uint32Array(5));
  return 'Domtim-' + [0, 1, 2, 3].map((i) => crke[r[i] % crke.length]).join('') + (1000 + (r[4] % 9000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return odg({ napaka: 'Method not allowed' }, 405);

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return odg({ napaka: 'Neprijavljen' }, 401);
  const { data: jaz } = await sb.from('profili').select('id, vloga, aktiven').eq('id', u.user.id).single();
  if (!jaz?.aktiven || !['vodja', 'pisarna'].includes(jaz.vloga)) return odg({ napaka: 'Gesla lahko ponastavlja samo pisarna' }, 403);

  const { uporabnik_id } = await req.json().catch(() => ({}));
  if (!uporabnik_id || typeof uporabnik_id !== 'string') return odg({ napaka: 'Napačna zahteva' }, 400);
  if (uporabnik_id === jaz.id) return odg({ napaka: 'Svoje geslo spremeni v meniju »Spremeni geslo«' }, 400);
  const { data: on } = await sb.from('profili').select('id, ime').eq('id', uporabnik_id).single();
  if (!on) return odg({ napaka: 'Zaposleni ne obstaja' }, 404);

  const geslo = novoGeslo();
  const { error } = await sb.auth.admin.updateUserById(uporabnik_id, { password: geslo });
  if (error) return odg({ napaka: 'Gesla ni bilo mogoče nastaviti: ' + error.message }, 500);
  console.log(`geslo ponastavljeno: ${on.ime} (izvedel ${jaz.id})`);
  return odg({ ok: true, ime: on.ime, geslo });
});
