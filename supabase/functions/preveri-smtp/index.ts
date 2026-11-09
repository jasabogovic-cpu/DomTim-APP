// Preveri, ali je geslo za info@domtim.si nastavljeno in ali ga strežnik sprejme (ne pošlje ničesar).
import nodemailer from 'npm:nodemailer@6.9.16';
Deno.serve(async () => {
  const surovo = Deno.env.get('SMTP_GESLO') || '';
  const geslo = surovo.trim();
  if (!geslo) return Response.json({ ok: false, napaka: 'SMTP_GESLO ni nastavljen' });
  const info = { dolzina: geslo.length, odstranjeno_presledkov: surovo.length - geslo.length };
  try {
    const t = nodemailer.createTransport({ host: 'mail.domtim.si', port: 465, secure: true, auth: { user: 'info@domtim.si', pass: geslo } });
    await t.verify();
    return Response.json({ ok: true, ...info });
  } catch (e) {
    return Response.json({ ok: false, napaka: (e as Error).message.slice(0, 200), ...info });
  }
});
