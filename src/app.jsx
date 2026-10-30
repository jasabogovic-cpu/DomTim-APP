import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { sb, AKTIVNI } from './lib.js';
import { DataCtx, Avatar } from './ui.jsx';
import { NalogaObrazec, NalogaPodrobno, HitriVnos } from './naloga.jsx';
import { LayoutDashboard, ListChecks, ClipboardList, CalendarDays, Building2, Flame, FolderOpen, Users, LogOut, Menu, Plus, X, PhoneCall } from 'lucide-react';

const Logo = ({ visina = 34 }) => <img src="ikone/logo.png" alt="DOMtim" className="logo-slika" style={{ height: visina }} />;
import { Pregled, Naloge, Moje, Plan, Objekti, Naprave, Dokumenti, Ekipa } from './views.jsx';

// --- Namestitev na telefon (PWA) ---
let odlozenPoziv = null;
const posluSalci = new Set();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); odlozenPoziv = e; posluSalci.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { odlozenPoziv = null; posluSalci.forEach((f) => f()); });
const jeNamesceno = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const jeIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function Namesti({ vedno }) {
  const [, osvezi] = useState(0);
  const [skrito, setSkrito] = useState(() => { try { return localStorage.getItem('namesti-skrij') === '1'; } catch { return false; } });
  const [iosNavodila, setIosNavodila] = useState(false);
  useEffect(() => { const f = () => osvezi((x) => x + 1); posluSalci.add(f); return () => posluSalci.delete(f); }, []);
  if (jeNamesceno() || (skrito && !vedno)) return null;
  const ios = jeIOS();
  if (!odlozenPoziv && !ios) return null;
  const namesti = async () => {
    if (ios) return setIosNavodila(true);
    odlozenPoziv.prompt();
    await odlozenPoziv.userChoice;
    odlozenPoziv = null; osvezi((x) => x + 1);
  };
  const skrij = () => { setSkrito(true); try { localStorage.setItem('namesti-skrij', '1'); } catch {} };
  return (
    <div className="namesti">
      <img src="ikone/ikona-192.png" alt="" />
      <div className="namesti-besedilo">
        <b>Namesti DOMtim na telefon</b>
        {iosNavodila
          ? <small>V Safariju tapni <b>Deli</b> (kvadrat s puščico ⬆) spodaj, nato <b>»Dodaj na začetni zaslon«</b>.</small>
          : <small>Odpiraj jo z ikono na začetnem zaslonu, brez povezave.</small>}
      </div>
      {!iosNavodila && <button className="gumb primarni mali" onClick={namesti}>Namesti</button>}
      {!vedno && <button className="ikona-gumb" onClick={skrij} aria-label="Skrij"><X size={18} /></button>}
    </div>
  );
}

const DEMO = [
  ['direktor@domtim.demo', 'Direktor', 'Andrej Z.'],
  ['poslovodja@domtim.demo', 'Poslovodja', 'Petra K.'],
  ['teren1@domtim.demo', 'Serviser (teren)', 'Rok K.'],
  ['teren3@domtim.demo', 'Hišnik (teren)', 'Jure L.'],
];

function Prijava() {
  const [email, setEmail] = useState('');
  const [geslo, setGeslo] = useState('');
  const [napaka, setNapaka] = useState('');
  const [nalagam, setNalagam] = useState(false);
  const prijava = async (e, em = email, pw = geslo) => {
    e?.preventDefault();
    setNalagam(true); setNapaka('');
    const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
    setNalagam(false);
    if (error) setNapaka(error.message === 'Invalid login credentials' ? 'Napačen e-naslov ali geslo.' : error.message);
  };
  return (
    <div className="prijava">
      <div className="prijava-okno">
        <Logo visina={72} />
        <p className="podnaslov">Delovni nalogi · objekti · dokumenti</p>
        <form onSubmit={prijava} className="obrazec ena">
          <label className="polje"><span>E-naslov</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
          <label className="polje"><span>Geslo</span><input type="password" value={geslo} onChange={(e) => setGeslo(e.target.value)} autoComplete="current-password" required /></label>
          {napaka && <div className="napaka">{napaka}</div>}
          <button className="gumb primarni polna" disabled={nalagam}>{nalagam ? 'Prijavljam …' : 'Prijava'}</button>
        </form>
        <Namesti vedno />
        <div className="demo">
          <p>Preizkusni dostop (prototip):</p>
          <div className="demo-gumbi">
            {DEMO.map(([em, vloga, ime]) => (
              <button key={em} className="gumb mali" onClick={() => prijava(null, em, 'Domtim2026!')}><b>{vloga}</b><small>{ime}</small></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function beriHash() {
  const [pot, q] = location.hash.replace(/^#\/?/, '').split('?');
  const [stran, id] = (pot || '').split('/');
  const filter = q ? Object.fromEntries(new URLSearchParams(q)) : {};
  if (filter.zamuja) filter.zamuja = filter.zamuja === 'true';
  return { stran: stran || null, id: id ? +id : null, filter };
}

function Aplikacija({ session }) {
  const [me, setMe] = useState(null);
  const [podatki, setPodatki] = useState({ profili: [], objekti: [], naprave: [], naloge: [] });
  const [verzija, setVerzija] = useState(0);
  const [pot, setPot] = useState(beriHash());
  const [odprtaNaloga, setOdprtaNaloga] = useState(null);
  const [novaPriv, setNovaPriv] = useState(null);
  const [obvestila, setObvestila] = useState([]);
  const [meni, setMeni] = useState(false);
  const [hitri, setHitri] = useState(false);

  const toast = useCallback((t, napaka) => {
    const id = Math.random();
    setObvestila((o) => [...o, { id, t, napaka }]);
    setTimeout(() => setObvestila((o) => o.filter((x) => x.id !== id)), 3500);
  }, []);

  const osvezi = useCallback(async () => {
    const [p, o, n, l] = await Promise.all([
      sb.from('profili').select('*').order('ime'),
      sb.from('objekti').select('*').order('naziv'),
      sb.from('naprave').select('*'),
      sb.from('naloge').select('*').order('id', { ascending: false }),
    ]);
    setPodatki({ profili: p.data || [], objekti: o.data || [], naprave: n.data || [], naloge: l.data || [] });
    setMe((p.data || []).find((x) => x.id === session.user.id) || null);
    setVerzija((v) => v + 1);
  }, [session.user.id]);

  useEffect(() => { osvezi(); }, [osvezi]);

  // realtime: spremembe nalog in komentarjev
  const casovnik = useRef();
  useEffect(() => {
    const ch = sb.channel('spremembe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'naloge' }, () => { clearTimeout(casovnik.current); casovnik.current = setTimeout(osvezi, 300); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'komentarji' }, () => setVerzija((v) => v + 1))
      .subscribe();
    const vidno = () => document.visibilityState === 'visible' && osvezi();
    document.addEventListener('visibilitychange', vidno);
    return () => { sb.removeChannel(ch); document.removeEventListener('visibilitychange', vidno); };
  }, [osvezi]);

  useEffect(() => {
    const h = () => { setPot(beriHash()); setMeni(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const pojdi = useCallback((stran, filter, id) => {
    const q = filter ? '?' + new URLSearchParams(filter).toString() : '';
    location.hash = `#/${stran}${id ? '/' + id : ''}${q}`;
  }, []);

  const ctx = useMemo(() => ({
    ...podatki, me, verzija, toast, osvezi, pojdi,
    odpriNalogo: (id) => setOdprtaNaloga(id),
    odpriObjekt: (id) => pojdi('objekti', null, id),
    novaNaloga: (priv = {}) => setNovaPriv(priv),
    hitriVnos: () => setHitri(true),
  }), [podatki, me, verzija, toast, osvezi, pojdi]);

  if (!me) return <div className="nalaganje"><Logo visina={72} /><p>Nalagam …</p></div>;

  const teren = me.vloga === 'teren';
  const stran = pot.stran || (teren ? 'moje' : 'pregled');
  const mojih = podatki.naloge.filter((n) => n.dodeljeno_id === me.id && AKTIVNI.includes(n.status)).length;
  const nujnih = podatki.naloge.filter((n) => n.prioriteta === 'nujno' && AKTIVNI.includes(n.status)).length;

  const NAV = [
    ...(!teren ? [['pregled', LayoutDashboard, 'Pregled']] : []),
    ['moje', ListChecks, 'Moje naloge', mojih],
    ['naloge', ClipboardList, 'Vsi nalogi', nujnih, true],
    ['plan', CalendarDays, 'Tedenski plan'],
    ['objekti', Building2, 'Objekti'],
    ['naprave', Flame, 'Naprave in pregledi'],
    ['dokumenti', FolderOpen, 'Dokumenti'],
    ['ekipa', Users, 'Ekipa'],
  ];
  const MOBILNO = teren ? ['moje', 'naloge', 'objekti', 'dokumenti'] : ['pregled', 'naloge', 'plan', 'objekti'];

  const vsebina = {
    pregled: <Pregled />, naloge: <Naloge filterZacetni={pot.filter} />, moje: <Moje />, plan: <Plan />,
    objekti: <Objekti izbran={pot.id} />, naprave: <Naprave />, dokumenti: <Dokumenti />, ekipa: <Ekipa />,
  }[stran] || <Pregled />;

  return (
    <DataCtx.Provider value={ctx}>
      <div className={'lupina' + (meni ? ' meni-odprt' : '')}>
        <aside className="stranska">
          <div className="stranska-logo"><Logo visina={56} /></div>
          {!teren && <button className="gumb primarni hitri-gumb" onClick={() => setHitri(true)}><PhoneCall size={16} /> Hiter vnos klica</button>}
          <nav>
            {NAV.map(([k, ik, l, st, rdeca]) => (
              <a key={k} href={'#/' + k} className={stran === k ? 'on' : ''}>
                <span className="nav-ik">{React.createElement(ik, { size: 18 })}</span>{l}{st > 0 && <span className={'nav-st' + (rdeca ? ' rdeca' : '')}>{st}</span>}
              </a>
            ))}
          </nav>
          <div className="jaz">
            <Avatar p={me} size={34} />
            <div><b>{me.ime}</b><small>{me.delovno_mesto}</small></div>
            <button className="ikona-gumb" title="Odjava" onClick={() => sb.auth.signOut()}><LogOut size={18} /></button>
          </div>
        </aside>
        <div className="mobilna-glava">
          <button className="ikona-gumb" onClick={() => setMeni(!meni)}><Menu size={22} /></button>
          <Logo visina={32} />
          <button className="ikona-gumb plus" onClick={() => teren ? setNovaPriv({ dodeljeno_id: me.id, vir: 'osebno' }) : setHitri(true)}><Plus size={22} /></button>
        </div>
        {meni && <div className="meni-ozadje" onClick={() => setMeni(false)} />}
        <main><div className="namesti-ovoj"><Namesti /></div>{vsebina}</main>
        <nav className="spodnja">
          {MOBILNO.map((k) => { const x = NAV.find((n) => n[0] === k); return (
            <a key={k} href={'#/' + k} className={stran === k ? 'on' : ''}><span>{React.createElement(x[1], { size: 21 })}</span>{x[2].split(' ')[0]}{x[3] > 0 && <i>{x[3]}</i>}</a>
          ); })}
        </nav>
      </div>
      {odprtaNaloga && <NalogaPodrobno id={odprtaNaloga} onClose={() => setOdprtaNaloga(null)} />}
      {novaPriv && <NalogaObrazec privzeto={novaPriv} onClose={() => setNovaPriv(null)} onSaved={(n) => { osvezi(); setOdprtaNaloga(n.id); }} />}
      {hitri && <HitriVnos onClose={() => setHitri(false)} onVec={(priv) => { setHitri(false); setNovaPriv(Object.fromEntries(Object.entries(priv).filter(([, v]) => v != null))); }} onSaved={(n) => setOdprtaNaloga(n.id)} />}
      <div className="obvestila">{obvestila.map((o) => <div key={o.id} className={'obvestilo' + (o.napaka ? ' napaka' : '')}>{o.t}</div>)}</div>
    </DataCtx.Provider>
  );
}

function Koren() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return null;
  return session ? <Aplikacija key={session.user.id} session={session} /> : <Prijava />;
}

createRoot(document.getElementById('app')).render(<Koren />);
