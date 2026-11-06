// Pošlje obvestila (web push) zaposlenim ob dogodkih na nalogih.
// 1) Sprožilec v bazi (pg_net) z internim žetonom:
//    - nov:       pisarna; dodeljeni delavci dobijo »dodeljeno tebi«
//    - dodelitev: samo novo dodeljeni delavci
//    - opravljen: pisarna (računovodstvo dobi »za obračun«, če se zaračuna)
//    - obracunan: direktor
//    Terenski delavci dobijo SAMO obvestila o nalogih, dodeljenih njim.
//    Kdor spremembo naredi sam (akter), obvestila ne dobi.
// 2) Prijavljen uporabnik z {test:true}: testno obvestilo na vse njegove naprave.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
let kljuci: { private: string; public: string; token: string } | null = null;
const datum = (d: string) => new Date(d).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

type Sub = { id: number; uporabnik_id: string; endpoint: string; p256dh: string; auth: string };
async function poslji(subs: Sub[], sporocilo: (s: Sub) => object | undefined, nujno = false) {
  let poslano = 0, napake = 0; const podrobno: string[] = [];
  await Promise.all(subs.map(async (s) => {
    const m = sporocilo(s); if (!m) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), { TTL: 86400, urgency: nujno ? 'high' : 'normal' });
      poslano++; podrobno.push(new URL(s.endpoint).host + ': ok');
    } catch (e) {
      napake++;
      const status = (e as { statusCode?: number }).statusCode;
      podrobno.push(new URL(s.endpoint).host + ': ' + status);
      if (status === 404 || status === 410) await sb.from('push_narocnine').delete().eq('id', s.id);
      console.error('push napaka', status, (e as Error).message, (e as { body?: string }).body);
    }
  }));
  return { poslano, napake, podrobno };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });
  if (!kljuci) {
    const { data, error } = await sb.rpc('push_podatki');
    if (error || !data) return new Response('Ni ključev: ' + error?.message, { status: 500, headers: CORS });
    kljuci = data;
    webpush.setVapidDetails('mailto:info@domtim.si', kljuci!.public, kljuci!.private);
  }
  const telo = await req.json().catch(() => ({}));

  // --- testno obvestilo za prijavljenega uporabnika ---
  if (telo.test) {
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return new Response('Neprijavljen', { status: 401, headers: CORS });
    const { data: subs } = await sb.from('push_narocnine').select('id, uporabnik_id, endpoint, p256dh, auth').eq('uporabnik_id', u.user.id);
    const r = await poslji(subs || [], () => ({ title: '🔔 Testno obvestilo DOMtim', body: 'Obvestila delujejo na tej napravi.', url: './', tag: 'test-' + Date.now() }));
    return Response.json({ naprav: subs?.length || 0, ...r }, { headers: CORS });
  }

  if (req.headers.get('x-domtim-token') !== kljuci!.token) return new Response('Forbidden', { status: 403 });
  const { dogodek, naloga_id, akter, novi } = telo;
  const { data: n } = await sb.from('naloge').select('id, naslov, prioriteta, rok, objekt_id, dodeljeno_id, sodelavci, za_racun, lokacija, stevilka_racuna').eq('id', naloga_id).single();
  if (!n) return new Response('Ni naloga', { status: 404 });
  const { data: ljudje } = await sb.from('profili').select('id, ime, vloga, prejema_obracun').eq('aktiven', true);
  const ime = (id: string | null) => ljudje?.find((p) => p.id === id)?.ime || '';
  let objekt = n.lokacija || '';
  const dodeljeni: string[] = [n.dodeljeno_id, ...(n.sodelavci || [])].filter(Boolean);
  const zaDodelitev: string[] = dogodek === 'dodelitev' && novi?.length ? novi : dodeljeni;
  if (n.objekt_id) {
    const { data: o } = await sb.from('objekti').select('naziv').eq('id', n.objekt_id).single();
    if (o) objekt = o.naziv;
  }
  const nujno = n.prioriteta === 'nujno';
  const link = `./#/naloge?naloga=${n.id}`;
  const tag = `naloga-${n.id}-${dogodek}`;

  const sporocila = new Map<string, { title: string; body: string; url: string; tag: string }>();
  for (const p of ljudje || []) {
    if (p.id === akter) continue;
    const teren = p.vloga === 'teren';
    if (teren && !((dogodek === 'nov' || dogodek === 'dodelitev') && zaDodelitev.includes(p.id))) continue;
    if (dogodek === 'obracunan') {
      if (p.vloga === 'vodja') sporocila.set(p.id, { title: `💶 Zaračunano: #${n.id} ${n.naslov}`, body: [objekt, n.stevilka_racuna && 'račun ' + n.stevilka_racuna].filter(Boolean).join(' · ') || 'Nalog je obračunan', url: link, tag });
      continue;
    }
    if (dogodek === 'nov' || dogodek === 'dodelitev') {
      if (zaDodelitev.includes(p.id)) {
        sporocila.set(p.id, { title: (nujno ? '⚠ NUJNO – dodeljeno tebi: ' : 'Dodeljeno tebi: ') + n.naslov, body: [objekt, n.rok && 'rok ' + datum(n.rok)].filter(Boolean).join(' · ') || 'Odpri za podrobnosti', url: `./#/moje?naloga=${n.id}`, tag });
      } else if (dogodek === 'nov') {
        sporocila.set(p.id, { title: (nujno ? '⚠ Nov NUJEN nalog: ' : 'Nov nalog: ') + n.naslov, body: [objekt, dodeljeni.length ? 'dodeljeno: ' + dodeljeni.map(ime).join(', ') : 'nedodeljeno'].filter(Boolean).join(' · '), url: link, tag });
      }
    } else if (dogodek === 'opravljen') {
      const kdo = dodeljeni.map(ime).filter(Boolean).join(", ") || ime(akter);
      if (p.prejema_obracun && n.za_racun) sporocila.set(p.id, { title: `Za obračun: #${n.id} ${n.naslov}`, body: [kdo && 'zaključil ' + kdo, objekt].filter(Boolean).join(' · '), url: `./#/obracun?naloga=${n.id}`, tag });
      else sporocila.set(p.id, { title: `✓ Opravljeno: ${n.naslov}`, body: [kdo, objekt].filter(Boolean).join(' · '), url: link, tag });
    }
  }
  if (!sporocila.size) return Response.json({ dogodek, poslano: 0 });
  const { data: subs } = await sb.from('push_narocnine').select('id, uporabnik_id, endpoint, p256dh, auth').in('uporabnik_id', [...sporocila.keys()]);
  const r = await poslji(subs || [], (s) => sporocila.get(s.uporabnik_id), nujno);
  return Response.json({ dogodek, naloga_id, prejemnikov: sporocila.size, narocnin: subs?.length || 0, ...r });
});
