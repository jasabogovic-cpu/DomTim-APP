import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import { sb } from './lib.js';

const VAPID_JAVNI = 'BKkkQmDHhzXY1n8M8aYvtrNGgjoIFajAbLnlYyGAPAeG4VjZn8mpW-bahZadK8rbdd6I-8JV2d7346Dqz5jhNrA';

const b64 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const podprto = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const jeIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const namesceno = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

async function shraniNarocnino(sub, uid) {
  const j = sub.toJSON();
  // če je ta naprava prej pripadala drugemu uporabniku, ga zamenjamo
  await sb.from('push_narocnine').delete().eq('endpoint', j.endpoint);
  const { error } = await sb.from('push_narocnine').insert({
    uporabnik_id: uid, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    naprava: navigator.userAgent.slice(0, 200),
  });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

/** Ob prijavi: če so obvestila že dovoljena, naročnino osvežimo za tega uporabnika. */
export async function osveziNarocnino(uid) {
  if (!podprto() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_JAVNI) });
    await shraniNarocnino(sub, uid);
  } catch (e) { console.warn('naročnina', e); }
}

/** Ob odjavi: ta naprava ne sme več dobivati obvestil za odjavljenega uporabnika. */
export async function odjaviNarocnino() {
  if (!podprto()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sb.from('push_narocnine').delete().eq('endpoint', sub.endpoint);
  } catch {}
}

export function useObvestila(uid, toast) {
  const [stanje, setStanje] = useState(() => !podprto() ? (jeIOS() && !namesceno() ? 'ios-namesti' : 'ni') : Notification.permission);
  useEffect(() => { if (stanje === 'granted') osveziNarocnino(uid); }, [uid]);
  const vklopi = async () => {
    if (jeIOS() && !namesceno()) { setStanje('ios-namesti'); return; }
    if (!podprto()) { toast('Ta brskalnik ne podpira obvestil.', true); return; }
    const p = await Notification.requestPermission();
    setStanje(p);
    if (p !== 'granted') { toast('Obvestila so zavrnjena. Vklopiš jih v nastavitvah telefona.', true); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_JAVNI) });
      await shraniNarocnino(sub, uid);
      toast('Obvestila vklopljena ✓');
    } catch (e) { toast('Napaka pri vklopu obvestil: ' + e.message, true); }
  };
  return { stanje, vklopi };
}

/** Pasica na vrhu: povabi k vklopu obvestil. */
export function ObvestilaPasica({ obv }) {
  const [skrito, setSkrito] = useState(() => { try { return sessionStorage.getItem('obv-skrij') === '1'; } catch { return false; } });
  if (skrito || obv.stanje === 'granted' || obv.stanje === 'ni' || obv.stanje === 'denied') return null;
  const skrij = () => { setSkrito(true); try { sessionStorage.setItem('obv-skrij', '1'); } catch {} };
  return (
    <div className="namesti obvestila-pasica">
      <span className="obv-ikona"><BellRing size={22} /></span>
      <div className="namesti-besedilo">
        <b>Vklopi obvestila</b>
        {obv.stanje === 'ios-namesti'
          ? <small>Na iPhonu obvestila delujejo samo, če aplikacijo namestiš: v Safariju tapni <b>Deli ⬆</b> → <b>»Dodaj na začetni zaslon«</b> in jo odpri z ikone.</small>
          : <small>Takoj izveš za nove naloge, dodelitve in opravljeno delo.</small>}
      </div>
      {obv.stanje !== 'ios-namesti' && <button className="gumb primarni mali" onClick={obv.vklopi}>Vklopi</button>}
      <button className="ikona-gumb" onClick={skrij} aria-label="Skrij"><X size={18} /></button>
    </div>
  );
}

export async function testnoObvestilo(toast) {
  const { data, error } = await sb.functions.invoke('poslji-obvestilo', { body: { test: true } });
  if (error) return toast('Napaka: ' + error.message, true);
  if (!data.naprav) return toast('Na tem računu ni vklopljenih obvestil. Najprej tapni »Vklopi obvestila«.', true);
  toast(`Testno obvestilo poslano na ${data.poslano} od ${data.naprav} naprav`);
}

/** Majhen indikator v meniju. */
export function ObvestilaStikalo({ obv, toast }) {
  if (obv.stanje === 'ni') return null;
  const vklop = obv.stanje === 'granted';
  return (
    <div className="obv-vrstica">
      <button className={'obv-stikalo' + (vklop ? ' on' : '')} onClick={vklop ? undefined : obv.vklopi} title={obv.stanje === 'denied' ? 'Obvestila so blokirana v nastavitvah brskalnika' : ''}>
        {vklop ? <Bell size={16} /> : <BellOff size={16} />}
        {vklop ? 'Obvestila vklopljena' : obv.stanje === 'denied' ? 'Obvestila blokirana' : 'Vklopi obvestila'}
      </button>
      {vklop && <button className="obv-test" onClick={() => testnoObvestilo(toast)} title="Pošlji testno obvestilo na vse moje naprave">Test</button>}
    </div>
  );
}
