import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ldpyktbiljlapcljtrnh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_286ggyfutgumFjch6DuMXQ_xtUrZXad';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const STATUSI = {
  odprta: { l: 'Odprta', c: '#64748b' },
  dodeljena: { l: 'Dodeljena', c: '#2563eb' },
  v_teku: { l: 'V teku', c: '#d97706' },
  caka: { l: 'Čaka', c: '#7c3aed' },
  opravljena: { l: 'Opravljena', c: '#16a34a' },
  preklicana: { l: 'Preklicana', c: '#9ca3af' },
};
export const AKTIVNI = ['odprta', 'dodeljena', 'v_teku', 'caka'];

export const PRIORITETE = {
  nujno: { l: 'Nujno', c: '#dc2626', r: 0 },
  visoka: { l: 'Visoka', c: '#ea580c', r: 1 },
  normalna: { l: 'Normalna', c: '#64748b', r: 2 },
  nizka: { l: 'Nizka', c: '#94a3b8', r: 3 },
};

export const KATEGORIJE = [
  'vzdrževanje', 'kurilne naprave', 'strojne inštalacije', 'elektro inštalacije',
  'kanalizacija', 'hišniška opravila', 'pregled', 'upravljanje', 'administracija',
];
export const KAT_IKONA = {
  'vzdrževanje': '🔧', 'kurilne naprave': '🔥', 'strojne inštalacije': '🚰', 'elektro inštalacije': '⚡',
  'kanalizacija': '🕳️', 'hišniška opravila': '🧹', 'pregled': '📋', 'upravljanje': '🏢', 'administracija': '🗂️',
};
export const VIRI = ['telefon', 'e-pošta', 'osebno', 'redni pregled', 'interno'];
export const MAPE = ['Pogodbe', 'Zapisniki in poročila', 'Fotografije s terena', 'Računi in ponudbe', 'Tehnična dokumentacija', 'Zbori lastnikov', 'Drugo'];
export const MAPA_IKONA = {
  'Pogodbe': '📑', 'Zapisniki in poročila': '📝', 'Fotografije s terena': '📷', 'Računi in ponudbe': '💶',
  'Tehnična dokumentacija': '📐', 'Zbori lastnikov': '👥', 'Drugo': '📁',
};

export const danes = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const isoDan = (d) => {
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const fDatum = (s) => s ? new Date(s).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '–';
export const fDatumKratko = (s) => s ? new Date(s).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' }) : '–';
export const fUra = (s) => s ? new Date(s).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }) : '';
export const fCas = (s) => s ? `${fDatum(s)} ${fUra(s)}` : '–';
export const fRelativno = (s) => {
  const min = Math.round((Date.now() - new Date(s)) / 60000);
  if (min < 1) return 'pravkar';
  if (min < 60) return `pred ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `pred ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'včeraj';
  if (d < 30) return `pred ${d} dnevi`;
  return fDatum(s);
};
export const fVelikost = (b) => !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
export const fMinute = (m) => !m ? '–' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;

export const zamuja = (n) => n.rok && AKTIVNI.includes(n.status) && new Date(n.rok) < danes();
export const rokDanes = (n) => n.rok && isoDan(n.rok) === isoDan(new Date());
export const dniDo = (d) => Math.round((new Date(d) - danes()) / 86400000);

export const sortNaloge = (a, b) => {
  const za = zamuja(a) ? 0 : 1, zb = zamuja(b) ? 0 : 1;
  if (za !== zb) return za - zb;
  const pa = PRIORITETE[a.prioriteta].r, pb = PRIORITETE[b.prioriteta].r;
  if (pa !== pb) return pa - pb;
  return (a.rok || '9999').localeCompare(b.rok || '9999');
};

export const varnoIme = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
export const zacetnice = (ime = '') => ime.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
export const mapsUrl = (o) => o ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.naslov + ', ' + o.kraj)}` : null;
