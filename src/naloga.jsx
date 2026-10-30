import React, { useEffect, useRef, useState } from 'react';
import {
  sb, STATUSI, PRIORITETE, KATEGORIJE, VIRI, MAPE, MAPA_IKONA, fDatum, fCas, fRelativno, fVelikost, fMinute,
  isoDan, zamuja, varnoIme, mapsUrl,
} from './lib.js';
import { useData, Status, Prio, Kat, Avatar, Modal, Polje, MapaIk } from './ui.jsx';
import { Euro, Hand, Play, Pause, Check, RotateCcw, MapPin, Phone, Mail, Pencil, Paperclip, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';

/* ---------- Obrazec za nov / urejanje naloga ---------- */
export function NalogaObrazec({ naloga, privzeto = {}, onClose, onSaved }) {
  const { profili, objekti, naprave, me, toast } = useData();
  const nov = !naloga;
  const [f, setF] = useState(() => {
    const n = naloga || {};
    return {
      naslov: n.naslov || '', opis: n.opis || '', objekt_id: n.objekt_id || '', naprava_id: n.naprava_id || '',
      kategorija: n.kategorija || 'vzdrževanje', prioriteta: n.prioriteta || 'normalna',
      dodeljeno_id: n.dodeljeno_id || '', rok: n.rok || '', termin: n.termin ? toLocalInput(n.termin) : '',
      vir: n.vir || 'telefon', prijavitelj: n.prijavitelj || '', prijavitelj_kontakt: n.prijavitelj_kontakt || '',
      za_racun: n.za_racun || false, ...privzeto,
    };
  });
  const [shranjujem, setShranjujem] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const pisarna = me.vloga !== 'teren';
  const napraveObj = naprave.filter((n) => String(n.objekt_id) === String(f.objekt_id));

  const shrani = async (e) => {
    e.preventDefault();
    if (!f.naslov.trim()) return;
    setShranjujem(true);
    const zapis = {
      ...f,
      objekt_id: f.objekt_id || null, naprava_id: f.naprava_id || null, dodeljeno_id: f.dodeljeno_id || null,
      rok: f.rok || null, termin: f.termin ? new Date(f.termin).toISOString() : null,
    };
    if (nov && zapis.dodeljeno_id) zapis.status = 'dodeljena';
    const q = nov ? sb.from('naloge').insert(zapis).select().single() : sb.from('naloge').update(zapis).eq('id', naloga.id).select().single();
    const { data, error } = await q;
    setShranjujem(false);
    if (error) return toast('Napaka: ' + error.message, true);
    toast(nov ? `Nalog #${data.id} ustvarjen` : 'Shranjeno');
    onSaved?.(data);
    onClose();
  };

  return (
    <Modal naslov={nov ? 'Nov delovni nalog' : `Uredi nalog #${naloga.id}`} onClose={onClose} siroko>
      <form onSubmit={shrani} className="obrazec">
        <Polje label="Naslov *" siroko>
          <input autoFocus value={f.naslov} onChange={set('naslov')} placeholder="npr. Ne dela ogrevanje v stanovanju 5" required />
        </Polje>
        <Polje label="Objekt">
          <select value={f.objekt_id} onChange={(e) => setF({ ...f, objekt_id: e.target.value, naprava_id: '' })}>
            <option value="">— brez objekta —</option>
            {objekti.map((o) => <option key={o.id} value={o.id}>{o.naziv} ({o.naslov})</option>)}
          </select>
        </Polje>
        <Polje label="Naprava">
          <select value={f.naprava_id} onChange={set('naprava_id')} disabled={!napraveObj.length}>
            <option value="">— {napraveObj.length ? 'izberi' : 'ni naprav'} —</option>
            {napraveObj.map((n) => <option key={n.id} value={n.id}>{n.tip} – {n.proizvajalec} {n.model}</option>)}
          </select>
        </Polje>
        <Polje label="Kategorija">
          <select value={f.kategorija} onChange={set('kategorija')}>
            {KATEGORIJE.map((k) => <option key={k}>{k}</option>)}
          </select>
        </Polje>
        <Polje label="Prioriteta">
          <div className="segment">
            {Object.entries(PRIORITETE).map(([k, v]) => (
              <button type="button" key={k} className={f.prioriteta === k ? 'on prio-' + k : ''} onClick={() => setF({ ...f, prioriteta: k })}>{v.l}</button>
            ))}
          </div>
        </Polje>
        {pisarna && (
          <Polje label="Dodeli delavcu">
            <select value={f.dodeljeno_id} onChange={set('dodeljeno_id')}>
              <option value="">— nedodeljeno —</option>
              <optgroup label="Teren">
                {profili.filter((p) => p.vloga === 'teren').map((p) => <option key={p.id} value={p.id}>{p.ime} – {p.delovno_mesto}</option>)}
              </optgroup>
              <optgroup label="Pisarna">
                {profili.filter((p) => p.vloga !== 'teren').map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}
              </optgroup>
            </select>
          </Polje>
        )}
        <Polje label="Rok">
          <input type="date" value={f.rok} onChange={set('rok')} />
        </Polje>
        <Polje label="Termin (dogovorjen obisk)">
          <input type="datetime-local" value={f.termin} onChange={set('termin')} />
        </Polje>
        <Polje label="Vir prijave">
          <select value={f.vir} onChange={set('vir')}>{VIRI.map((v) => <option key={v}>{v}</option>)}</select>
        </Polje>
        <Polje label="Prijavitelj">
          <input value={f.prijavitelj} onChange={set('prijavitelj')} placeholder="Ime in priimek / stanovanje" />
        </Polje>
        <Polje label="Kontakt prijavitelja">
          <input value={f.prijavitelj_kontakt} onChange={set('prijavitelj_kontakt')} placeholder="Telefon ali e-pošta" />
        </Polje>
        <Polje label="Opis" siroko>
          <textarea rows={4} value={f.opis} onChange={set('opis')} placeholder="Kaj je narobe, kje točno, dostop (ključ, koda), posebnosti ..." />
        </Polje>
        <label className="potrditev siroko">
          <input type="checkbox" checked={f.za_racun} onChange={set('za_racun')} /> Delo se zaračuna (gre v obračun)
        </label>
        <div className="gumbi siroko">
          <button type="button" className="gumb" onClick={onClose}>Prekliči</button>
          <button className="gumb primarni" disabled={shranjujem}>{shranjujem ? 'Shranjujem …' : nov ? 'Ustvari nalog' : 'Shrani'}</button>
        </div>
      </form>
    </Modal>
  );
}

function toLocalInput(s) {
  const d = new Date(s); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/* ---------- Podrobnosti naloga ---------- */
export function NalogaPodrobno({ id, onClose }) {
  const { naloge, profili, objekti, naprave, me, toast, odpriObjekt } = useData();
  const n = naloge.find((x) => x.id === id);
  const [uredi, setUredi] = useState(false);
  const [zakljuci, setZakljuci] = useState(false);
  if (!n) return null;
  const obj = objekti.find((o) => o.id === n.objekt_id);
  const nap = naprave.find((x) => x.id === n.naprava_id);
  const dod = profili.find((p) => p.id === n.dodeljeno_id);
  const ust = profili.find((p) => p.id === n.ustvaril_id);
  const pisarna = me.vloga !== 'teren';
  const lahkoUreja = pisarna || n.dodeljeno_id === me.id || !n.dodeljeno_id;

  const status = async (s, extra = {}) => {
    const { error } = await sb.from('naloge').update({ status: s, ...extra }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast('Status: ' + STATUSI[s].l);
  };
  const prevzemi = async () => {
    const { error } = await sb.from('naloge').update({ dodeljeno_id: me.id }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast('Nalog je zdaj tvoj');
  };
  const izbrisi = async () => {
    if (!confirm(`Izbrišem nalog #${n.id}? Tega ni mogoče razveljaviti.`)) return;
    const { error } = await sb.from('naloge').delete().eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else { toast('Nalog izbrisan'); onClose(); }
  };

  return (
    <Modal naslov={<span><span className="st-naloga">#{n.id}</span> {n.naslov}</span>} onClose={onClose} siroko>
      <div className="podrobno">
        <div className="podrobno-glavno">
          <div className="vrstica-znacke">
            <Status s={n.status} /> <Prio p={n.prioriteta} /> <Kat k={n.kategorija} />
            {zamuja(n) && <span className="prio prio-nujno">Zamuja</span>}
            {n.za_racun && <span className="znacka-racun"><Euro size={12} className="ik" /> za obračun</span>}
          </div>

          {lahkoUreja && n.status !== 'opravljena' && n.status !== 'preklicana' && (
            <div className="akcije">
              {!n.dodeljeno_id && <button className="gumb" onClick={prevzemi}><Hand size={16} /> Prevzemi</button>}
              {n.status !== 'v_teku' && <button className="gumb" onClick={() => status('v_teku')}><Play size={16} /> Začni delo</button>}
              {n.status !== 'caka' && <button className="gumb" onClick={() => status('caka')}><Pause size={16} /> Čaka (material / dostop)</button>}
              <button className="gumb uspeh" onClick={() => setZakljuci(true)}><Check size={16} /> Zaključi</button>
            </div>
          )}
          {lahkoUreja && (n.status === 'opravljena' || n.status === 'preklicana') && (
            <div className="akcije"><button className="gumb" onClick={() => status('odprta')}><RotateCcw size={16} /> Ponovno odpri</button></div>
          )}

          {n.opis && <p className="opis">{n.opis}</p>}

          {n.status === 'opravljena' && (
            <div className="porocilo">
              <h4>Poročilo o opravljenem delu</h4>
              <p>{n.porocilo || <em>Brez poročila.</em>}</p>
              <dl className="mini-dl">
                <dt>Porabljen čas</dt><dd>{fMinute(n.porabljen_cas_min)}</dd>
                <dt>Material</dt><dd>{n.material || '–'}</dd>
                <dt>Zaključeno</dt><dd>{fCas(n.opravljeno_at)}</dd>
              </dl>
            </div>
          )}
          {n.status !== 'opravljena' && n.porocilo && (
            <div className="porocilo opomba"><h4>Opomba s terena</h4><p>{n.porocilo}</p></div>
          )}

          <Datoteke nalogaId={n.id} objektId={n.objekt_id} />
          <Komentarji nalogaId={n.id} />
        </div>

        <aside className="podrobno-stran">
          <dl className="lastnosti">
            <dt>Objekt</dt>
            <dd>{obj ? <><a onClick={() => { onClose(); odpriObjekt(obj.id); }}>{obj.naziv}</a><br /><small>{obj.naslov}, {obj.kraj}</small><br /><a href={mapsUrl(obj)} target="_blank" rel="noreferrer" className="mala-povezava"><MapPin size={13} className="ik" /> Navigacija</a></> : '–'}</dd>
            {nap && <><dt>Naprava</dt><dd>{nap.tip}<br /><small>{nap.proizvajalec} {nap.model} · {nap.lokacija}</small></dd></>}
            <dt>Dodeljeno</dt>
            <dd className="oseba">{dod ? <><Avatar p={dod} size={22} /> {dod.ime}</> : <span className="sivo">Nedodeljeno</span>}</dd>
            <dt>Rok</dt><dd className={zamuja(n) ? 'rdece' : ''}>{fDatum(n.rok)}</dd>
            {n.termin && <><dt>Termin</dt><dd>{fCas(n.termin)}</dd></>}
            <dt>Prijavil</dt>
            <dd>{n.prijavitelj || '–'}{n.prijavitelj_kontakt && <><br />{/^[\d +/]+$/.test(n.prijavitelj_kontakt) ? <a href={'tel:' + n.prijavitelj_kontakt.replace(/\s/g, '')}><Phone size={13} className="ik" /> {n.prijavitelj_kontakt}</a> : <a href={'mailto:' + n.prijavitelj_kontakt}><Mail size={13} className="ik" /> {n.prijavitelj_kontakt}</a>}</>}</dd>
            <dt>Vir</dt><dd>{n.vir}</dd>
            <dt>Ustvaril</dt><dd>{ust?.ime || '–'}<br /><small>{fCas(n.created_at)}</small></dd>
          </dl>
          {lahkoUreja && <button className="gumb polna" onClick={() => setUredi(true)}><Pencil size={15} /> Uredi nalog</button>}
          {pisarna && <button className="gumb polna nevarno" onClick={izbrisi}>Izbriši</button>}
        </aside>
      </div>
      {uredi && <NalogaObrazec naloga={n} onClose={() => setUredi(false)} />}
      {zakljuci && <ZakljuciObrazec n={n} onClose={() => setZakljuci(false)} />}
    </Modal>
  );
}

function ZakljuciObrazec({ n, onClose }) {
  const { toast } = useData();
  const [f, setF] = useState({ porocilo: n.porocilo || '', porabljen_cas_min: n.porabljen_cas_min || '', material: n.material || '', za_racun: n.za_racun });
  const shrani = async (e) => {
    e.preventDefault();
    const { error } = await sb.from('naloge').update({
      status: 'opravljena', porocilo: f.porocilo, material: f.material || null,
      porabljen_cas_min: f.porabljen_cas_min ? parseInt(f.porabljen_cas_min) : null, za_racun: f.za_racun,
    }).eq('id', n.id);
    if (error) return toast('Napaka: ' + error.message, true);
    toast(`Nalog #${n.id} zaključen`);
    onClose();
  };
  return (
    <Modal naslov={`Zaključi nalog #${n.id}`} onClose={onClose}>
      <form onSubmit={shrani} className="obrazec ena">
        <Polje label="Kaj je bilo narejeno? *">
          <textarea rows={4} required value={f.porocilo} onChange={(e) => setF({ ...f, porocilo: e.target.value })} placeholder="Kratek opis opravljenega dela, ugotovitve, priporočila …" />
        </Polje>
        <Polje label="Porabljen čas (minute)">
          <div className="hitri-cas">
            <input type="number" min="0" step="5" value={f.porabljen_cas_min} onChange={(e) => setF({ ...f, porabljen_cas_min: e.target.value })} />
            {[15, 30, 60, 120].map((m) => <button type="button" key={m} className="gumb mali" onClick={() => setF({ ...f, porabljen_cas_min: m })}>{fMinute(m)}</button>)}
          </div>
        </Polje>
        <Polje label="Porabljen material">
          <input value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} placeholder="npr. tesnilo 1/2&quot;, 2x LED žarnica" />
        </Polje>
        <label className="potrditev"><input type="checkbox" checked={f.za_racun} onChange={(e) => setF({ ...f, za_racun: e.target.checked })} /> Zaračunaj stranki</label>
        <p className="namig">Fotografije in zapisnik lahko dodaš v razdelku »Datoteke« na nalogu.</p>
        <div className="gumbi"><button type="button" className="gumb" onClick={onClose}>Prekliči</button><button className="gumb uspeh"><Check size={16} /> Zaključi nalog</button></div>
      </form>
    </Modal>
  );
}

/* ---------- Komentarji / zgodovina ---------- */
function Komentarji({ nalogaId }) {
  const { profili, me, toast, verzija } = useData();
  const [seznam, setSeznam] = useState([]);
  const [besedilo, setBesedilo] = useState('');
  const nalozi = async () => {
    const { data } = await sb.from('komentarji').select('*').eq('naloga_id', nalogaId).order('created_at');
    setSeznam(data || []);
  };
  useEffect(() => { nalozi(); }, [nalogaId, verzija]);
  const dodaj = async (e) => {
    e.preventDefault();
    if (!besedilo.trim()) return;
    const { error } = await sb.from('komentarji').insert({ naloga_id: nalogaId, besedilo, avtor_id: me.id });
    if (error) return toast('Napaka: ' + error.message, true);
    setBesedilo(''); nalozi();
  };
  return (
    <div className="komentarji">
      <h4>Komentarji in zgodovina</h4>
      <ul>
        {seznam.map((k) => {
          const a = profili.find((p) => p.id === k.avtor_id);
          return k.sistemski ? (
            <li key={k.id} className="sistemski"><span>{k.besedilo}</span> · {a?.ime || 'sistem'} · {fRelativno(k.created_at)}</li>
          ) : (
            <li key={k.id} className="komentar">
              <Avatar p={a} size={26} />
              <div><div className="komentar-glava"><b>{a?.ime || 'Neznan'}</b> <small>{fRelativno(k.created_at)}</small></div><div>{k.besedilo}</div></div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={dodaj} className="komentar-vnos">
        <input value={besedilo} onChange={(e) => setBesedilo(e.target.value)} placeholder="Napiši komentar (npr. dogovor s stranko, potreben material) …" />
        <button className="gumb primarni">Pošlji</button>
      </form>
    </div>
  );
}

/* ---------- Datoteke (na nalogu ali objektu) ---------- */
export function Datoteke({ nalogaId, objektId, naslov = 'Datoteke in fotografije' }) {
  const { me, toast } = useData();
  const [seznam, setSeznam] = useState([]);
  const [urls, setUrls] = useState({});
  const [nalagam, setNalagam] = useState(false);
  const [galerija, setGalerija] = useState(null);
  const vhod = useRef();
  const slikeSeznam = seznam.filter((d) => urls[d.pot]);
  const nalozi = async () => {
    let q = sb.from('dokumenti').select('*').order('created_at', { ascending: false });
    q = nalogaId ? q.eq('naloga_id', nalogaId) : q.eq('objekt_id', objektId);
    const { data } = await q;
    setSeznam(data || []);
    const slike = (data || []).filter((d) => d.mime?.startsWith('image/'));
    if (slike.length) {
      const { data: s } = await sb.storage.from('dokumenti').createSignedUrls(slike.map((d) => d.pot), 3600);
      const m = {}; (s || []).forEach((x) => { m[x.path] = x.signedUrl; }); setUrls(m);
    }
  };
  useEffect(() => { nalozi(); }, [nalogaId, objektId]);

  const naloziDatoteke = async (files) => {
    setNalagam(true);
    for (const file of files) {
      const mapa = file.type.startsWith('image/') ? 'Fotografije s terena' : 'Zapisniki in poročila';
      const pot = `${varnoIme(mapa)}/${objektId || 'splosno'}/${Date.now()}_${varnoIme(file.name)}`;
      const up = await sb.storage.from('dokumenti').upload(pot, file, { contentType: file.type });
      if (up.error) { toast('Napaka pri nalaganju: ' + up.error.message, true); continue; }
      await sb.from('dokumenti').insert({ ime: file.name, pot, mapa, velikost: file.size, mime: file.type, objekt_id: objektId || null, naloga_id: nalogaId || null, nalozil_id: me.id });
    }
    setNalagam(false); toast('Naloženo'); nalozi();
  };

  return (
    <div className="datoteke">
      <div className="datoteke-glava">
        <h4>{naslov} {seznam.length > 0 && <small>({seznam.length})</small>}</h4>
        <button className="gumb mali" onClick={() => vhod.current.click()} disabled={nalagam}>{nalagam ? 'Nalagam …' : <><Paperclip size={14} /> Dodaj / fotografiraj</>}</button>
        <input ref={vhod} type="file" multiple hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { naloziDatoteke([...e.target.files]); e.target.value = ''; }} />
      </div>
      {seznam.length > 0 && (
        <div className="datoteke-mreza">
          {seznam.map((d) => (
            <a key={d.id} className="datoteka" onClick={() => urls[d.pot] ? setGalerija(slikeSeznam.findIndex((x) => x.id === d.id)) : odpriDatoteko(d)} title={d.ime}>
              {urls[d.pot] ? <img src={urls[d.pot]} alt={d.ime} /> : <span className="datoteka-ikona"><MapaIk m={d.mapa} s={28} /></span>}
              <span className="datoteka-ime">{d.ime}</span>
            </a>
          ))}
        </div>
      )}
      {galerija != null && slikeSeznam[galerija] && <Galerija slike={slikeSeznam} urls={urls} i={galerija} setI={setGalerija} />}
    </div>
  );
}

function Galerija({ slike, urls, i, setI }) {
  const d = slike[i];
  const n = slike.length;
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') setI(null);
      if (e.key === 'ArrowRight') setI((i + 1) % n);
      if (e.key === 'ArrowLeft') setI((i - 1 + n) % n);
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [i, n]);
  const zacetek = useRef(null);
  return (
    <div className="galerija" onClick={() => setI(null)}
      onTouchStart={(e) => { zacetek.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (zacetek.current ?? 0); if (Math.abs(dx) > 50 && n > 1) setI(((dx < 0 ? i + 1 : i - 1) + n) % n); }}>
      <div className="galerija-vrh" onClick={(e) => e.stopPropagation()}>
        <span>{d.ime} · {i + 1} / {n}</span>
        <button className="ikona-gumb" onClick={() => odpriDatoteko(d)} title="Odpri original"><Paperclip size={18} /></button>
        <button className="ikona-gumb" onClick={() => setI(null)}><X size={22} /></button>
      </div>
      <img src={urls[d.pot]} alt={d.ime} onClick={(e) => e.stopPropagation()} />
      {n > 1 && <>
        <button className="galerija-pusc levo" onClick={(e) => { e.stopPropagation(); setI((i - 1 + n) % n); }}><ChevronLeft size={30} /></button>
        <button className="galerija-pusc desno" onClick={(e) => { e.stopPropagation(); setI((i + 1) % n); }}><ChevronRight size={30} /></button>
      </>}
    </div>
  );
}

/* ---------- Hiter vnos med telefonskim klicem ---------- */
export function HitriVnos({ onClose, onVec, onSaved }) {
  const { objekti, profili, toast, osvezi } = useData();
  const [f, setF] = useState({ objekt_id: '', naslov: '', prijavitelj: '', prijavitelj_kontakt: '', nujno: false, dodeljeno_id: '' });
  const [shranjujem, setShranjujem] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const zapis = () => ({
    naslov: f.naslov.trim(), objekt_id: f.objekt_id || null, prijavitelj: f.prijavitelj || null, prijavitelj_kontakt: f.prijavitelj_kontakt || null,
    prioriteta: f.nujno ? 'nujno' : 'normalna', dodeljeno_id: f.dodeljeno_id || null, vir: 'telefon',
    status: f.dodeljeno_id ? 'dodeljena' : 'odprta', rok: f.nujno ? isoDan(new Date()) : null,
  });
  const shrani = async (e) => {
    e.preventDefault();
    if (!f.naslov.trim()) return;
    setShranjujem(true);
    const { data, error } = await sb.from('naloge').insert(zapis()).select().single();
    setShranjujem(false);
    if (error) return toast('Napaka: ' + error.message, true);
    toast(`Nalog #${data.id} vnesen`);
    osvezi(); onClose();
  };
  const teren = profili.filter((p) => p.vloga === 'teren');
  return (
    <Modal naslov="Hiter vnos klica" onClose={onClose}>
      <form onSubmit={shrani} className="obrazec ena hitri">
        <Polje label="Kaj je narobe? *">
          <input autoFocus required value={f.naslov} onChange={set('naslov')} placeholder="npr. ne dela ogrevanje, stanovanje 5" />
        </Polje>
        <Polje label="Objekt">
          <select value={f.objekt_id} onChange={set('objekt_id')}>
            <option value="">— izberi objekt —</option>
            {objekti.map((o) => <option key={o.id} value={o.id}>{o.naziv} – {o.naslov}</option>)}
          </select>
        </Polje>
        <div className="dva">
          <Polje label="Kdo kliče"><input value={f.prijavitelj} onChange={set('prijavitelj')} placeholder="Ime / stanovanje" /></Polje>
          <Polje label="Telefon"><input type="tel" value={f.prijavitelj_kontakt} onChange={set('prijavitelj_kontakt')} placeholder="041 …" /></Polje>
        </div>
        <button type="button" className={'nujno-gumb' + (f.nujno ? ' on' : '')} onClick={() => setF({ ...f, nujno: !f.nujno })}>
          <AlertTriangle size={18} /> {f.nujno ? 'NUJNO – rok danes' : 'Označi kot nujno'}
        </button>
        <div className="polje">
          <span>Pošlji delavcu (neobvezno)</span>
          <div className="delavci-izbira">
            {teren.map((p) => (
              <button type="button" key={p.id} className={f.dodeljeno_id === p.id ? 'on' : ''} onClick={() => setF({ ...f, dodeljeno_id: f.dodeljeno_id === p.id ? '' : p.id })}>
                <Avatar p={p} size={26} /> {p.ime.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="gumbi med">
          <button type="button" className="gumb brez-roba-g" onClick={() => onVec({ ...zapis(), naslov: f.naslov })}>Več podrobnosti</button>
          <button className="gumb primarni" disabled={shranjujem}>{shranjujem ? 'Shranjujem …' : <><Check size={16} /> Shrani nalog</>}</button>
        </div>
      </form>
    </Modal>
  );
}

export async function odpriDatoteko(d) {
  const { data, error } = await sb.storage.from('dokumenti').createSignedUrl(d.pot, 600);
  if (error) return alert('Datoteke ni mogoče odpreti: ' + error.message);
  window.open(data.signedUrl, '_blank');
}
