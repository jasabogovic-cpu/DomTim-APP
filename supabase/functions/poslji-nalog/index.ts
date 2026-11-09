// Pošlje izpolnjen delovni nalog (PDF) stranki z info@domtim.si.
// Kliče ga prijavljen zaposleni iz aplikacije: { naloga_id, pot } – PDF je že naložen v Storage (dokumenti/delovni-nalogi/...).
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const POSILJATELJ = 'info@domtim.si';
const odg = (x: unknown, status = 200) => Response.json(x, { status, headers: CORS });
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return odg({ napaka: 'Method not allowed' }, 405);

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return odg({ napaka: 'Neprijavljen' }, 401);
  const { data: jaz } = await sb.from('profili').select('id, ime, aktiven').eq('id', u.user.id).single();
  if (!jaz?.aktiven) return odg({ napaka: 'Ni dostopa' }, 403);

  const { naloga_id, pot } = await req.json().catch(() => ({}));
  if (!naloga_id || typeof pot !== 'string' || !pot.startsWith(`delovni-nalogi/${naloga_id}_`)) return odg({ napaka: 'Napačna zahteva' }, 400);
  const { data: n } = await sb.from('naloge').select('id, naslov, email_stranke, objekt_id, lokacija, datum_izpolnitve').eq('id', naloga_id).single();
  if (!n) return odg({ napaka: 'Ni naloga' }, 404);
  const prejemnik = (n.email_stranke || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(prejemnik)) return odg({ napaka: 'Nalog nima veljavne e-pošte stranke' }, 400);

  const geslo = Deno.env.get('SMTP_GESLO');
  if (!geslo) return odg({ napaka: 'Geslo za e-pošto (SMTP_GESLO) še ni nastavljeno v Supabase' }, 500);

  const { data: dat, error: e1 } = await sb.storage.from('dokumenti').download(pot);
  if (e1 || !dat) return odg({ napaka: 'PDF ni najden: ' + e1?.message }, 404);
  const pdf = new Uint8Array(await dat.arrayBuffer());

  let objekt = n.lokacija || '';
  if (n.objekt_id) { const { data: o } = await sb.from('objekti').select('naziv, naslov, kraj').eq('id', n.objekt_id).single(); if (o) objekt = `${o.naslov}, ${o.kraj}`; }

  const t = nodemailer.createTransport({ host: 'mail.domtim.si', port: 465, secure: true, auth: { user: POSILJATELJ, pass: geslo } });
  const besedilo = `Spoštovani,\n\nv priponki vam pošiljamo delovni nalog št. ${n.id} (${n.naslov})${objekt ? ' za ' + objekt : ''}.\n\nZa morebitna vprašanja smo vam na voljo na 05 99 22 140 ali na ${POSILJATELJ}.\n\nLep pozdrav,\nDOMtim d.o.o.\nHrastinska pot 36, Brežice`;
  try {
    await t.sendMail({
      from: `DOMtim <${POSILJATELJ}>`,
      to: prejemnik,
      bcc: POSILJATELJ,
      replyTo: POSILJATELJ,
      subject: `Delovni nalog št. ${n.id} – DOMtim`,
      text: besedilo,
      html: '<p>' + esc(besedilo).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>',
      attachments: [{ filename: `Delovni-nalog-${n.id}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  } catch (e) {
    const sporocilo = (e as Error).message.slice(0, 300);
    await sb.from('naloge').update({ pdf_napaka: sporocilo }).eq('id', n.id);
    console.error('smtp', sporocilo);
    return odg({ napaka: 'Pošiljanje ni uspelo: ' + sporocilo }, 502);
  }
  await sb.from('naloge').update({ pdf_poslan_at: new Date().toISOString(), pdf_poslan_na: prejemnik, pdf_napaka: null }).eq('id', n.id);
  await sb.from('komentarji').insert({ naloga_id: n.id, avtor_id: jaz.id, besedilo: `PDF delovnega naloga poslan stranki na ${prejemnik}`, sistemski: true });
  return odg({ ok: true, poslano_na: prejemnik });
});
