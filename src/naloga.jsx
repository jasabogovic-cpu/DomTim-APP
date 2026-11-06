import React, { useEffect, useRef, useState } from 'react';
import {
  sb, STATUSI, PRIORITETE, KATEGORIJE, VIRI, MAPE, MAPA_IKONA, fDatum, fCas, fRelativno, fVelikost, fMinute,
  isoDan, zamuja, varnoIme, mapsUrl, dodeljeni, jeDodeljen, stisniSliko,
} from './lib.js';
import { useData, Status, Prio, Kat, Avatar, Avatarji, Modal, Polje, MapaIk, DelavciIzbira, NacinIzbira } from './ui.jsx';
import { ZakljuciObrazec, DelovniNalog, izracun, fEur } from './delovni.jsx';
import { Euro, Hand, Play, Pause, Check, RotateCcw, MapPin, Phone, Mail, Pencil, Paperclip, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle, Printer, Camera } from 'lucide-react';

/* ---------- Fotografije ob ustvarjanju naloga ---------- */
export function FotoIzbira({ datoteke, setDatoteke }) {
  const vhod = useRef();
  const [predogledi, setPredogledi] = useState([]);
  useEffect(() => {
    const u = datoteke.map((f) => URL.createObjectURL(f)); setPredogledi(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [datoteke]);
  return (
    <div className="foto-izbira">
      {predogledi.map((u, i) => (
        <span key={u} className="foto-mini"><img src={u} alt="" /><button type="button" onClick={() => setDatoteke(datoteke.filter((_, j) => j !== i))} aria-label="Odstrani"><X size={12} /></button></span>
      ))}
      <button type="button" className="gumb mali" onClick={() => vhod.current.click()}><Camera size={15} /> {datoteke.length ? 'Dodaj še' : 'Dodaj fotografijo'}</button>
      <input ref={vhod} type="file" accept="image/*" multiple hidden onChange={(e) => { setDatoteke([...datoteke, ...e.target.files]); e.target.value = ''; }} />
    </div>
  );
}

export async function naloziFotografije(naloga, datoteke, uid) {
  for (const izvorna of datoteke) {
    const file = await stisniSliko(izvorna);
    const pot = `${varnoIme('Fotografije s terena')}/${naloga.objekt_id || 'splosno'}/${Date.now()}_${varnoIme(file.name)}`;
    const up = await sb.storage.from('dokumenti').upload(pot, file, { contentType: file.type });
    if (up.error) throw up.error;
    await sb.from('dokumenti').insert({ ime: file.name, pot, mapa: 'Fotografije s terena', velikost: file.size, mime: file.type, objekt_id: naloga.objekt_id || null, naloga_id: naloga.id, nalozil_id: uid });
  }
}

/* ---------- Obrazec za nov / urejanje naloga ---------- */
export function NalogaObrazec({ naloga, privzeto = {}, onClose, onSaved }) {
  const { profili, objekti, naprave, me, toast } = useData();
  const nov = !naloga;
  const [f, setF] = useState(() => {
    const n = { ...(naloga || {}), ...privzeto };
    return {
      naslov: n.naslov || '', opis: n.opis || '', objekt_id: n.objekt_id || (n.lokacija ? 'drugo' : ''), lokacija: n.lokacija || '', naprava_id: n.naprava_id || '',
      kategorija: n.kategorija || 'vzdrževanje', prioriteta: n.prioriteta || 'normalna',
      izvajalci: dodeljeni(n), rok: n.rok || '', termin: n.termin ? toLocalInput(n.termin) : '',
      vir: n.vir || 'telefon', prijavitelj: n.prijavitelj || '', prijavitelj_kontakt: n.prijavitelj_kontakt || '', email_stranke: n.email_stranke || '',
      za_racun: n.za_racun ?? true,
    };
  });
  const [fotke, setFotke] = useState([]);
  const [shranjujem, setShranjujem] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const pisarna = me.vloga !== 'teren';
  const drugo = f.objekt_id === 'drugo';
  const napraveObj = drugo ? [] : naprave.filter((n) => String(n.objekt_id) === String(f.objekt_id));

  const shrani = async (e) => {
    e.preventDefault();
    if (!f.naslov.trim()) return;
    if (drugo && !f.lokacija.trim()) return toast('Vpiši naslov / stranko za »Drugo«.', true);
    setShranjujem(true);
    const { izvajalci, ...ostalo } = f;
    const zapis = {
      ...ostalo,
      objekt_id: drugo ? null : f.objekt_id || null, lokacija: drugo ? f.lokacija.trim() : null,
      naprava_id: f.naprava_id || null, dodeljeno_id: izvajalci[0] || null, sodelavci: izvajalci.slice(1),
      rok: f.rok || null, termin: f.termin ? new Date(f.termin).toISOString() : null, email_stranke: f.email_stranke.trim() || null,
    };
    if (nov && zapis.dodeljeno_id) zapis.status = 'dodeljena';
    const q = nov ? sb.from('naloge').insert(zapis).select().single() : sb.from('naloge').update(zapis).eq('id', naloga.id).select().single();
    const { data, error } = await q;
    if (error) { setShranjujem(false); return toast('Napaka: ' + error.message, true); }
    if (fotke.length) { try { await naloziFotografije(data, fotke, me.id); } catch (err) { toast('Nalog je shranjen, fotografije pa ne: ' + err.message, true); } }
    setShranjujem(false);
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
            <option value="drugo">➕ Drugo / nova stranka …</option>
          </select>
        </Polje>
        {drugo ? (
          <Polje label="Naslov in stranka *">
            <input value={f.lokacija} onChange={set('lokacija')} placeholder="npr. Novak, Cesta 5, Brežice" />
          </Polje>
        ) : (
          <Polje label="Naprava">
            <select value={f.naprava_id} onChange={set('naprava_id')} disabled={!napraveObj.length}>
              <option value="">— {napraveObj.length ? 'izberi' : 'ni naprav'} —</option>
              {napraveObj.map((n) => <option key={n.id} value={n.id}>{n.tip} – {n.proizvajalec} {n.model}</option>)}
            </select>
          </Polje>
        )}
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
          <div className="polje siroko">
            <span>Dodeli delavcem {f.izvajalci.length > 1 && <small>(prvi izbrani je glavni izvajalec)</small>}</span>
            <DelavciIzbira profili={profili} izbrani={f.izvajalci} onChange={(x) => setF({ ...f, izvajalci: x })} />
          </div>
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
          <input value={f.prijavitelj_kontakt} onChange={set('prijavitelj_kontakt')} placeholder="Telefon" />
        </Polje>
        <Polje label="E-pošta stranke (za PDF)">
          <input type="email" value={f.email_stranke} onChange={set('email_stranke')} placeholder="stranka@primer.si" />
        </Polje>
        <Polje label="Opis" siroko>
          <textarea rows={4} value={f.opis} onChange={set('opis')} placeholder="Kaj je narobe, kje točno, dostop (ključ, koda), posebnosti ..." />
        </Polje>
        <div className="polje"><span>Način</span><NacinIzbira zaRacun={f.za_racun} onChange={(v) => setF({ ...f, za_racun: v })} /></div>
        {nov && <div className="polje siroko"><span>Fotografije</span><FotoIzbira datoteke={fotke} setDatoteke={setFotke} /></div>}
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
  const dodVsi = dodeljeni(n).map((id) => profili.find((p) => p.id === id)).filter(Boolean);
  const dod = dodVsi[0];
  const ust = profili.find((p) => p.id === n.ustvaril_id);
  const pisarna = me.vloga !== 'teren';
  const lahkoUreja = pisarna || jeDodeljen(n, me.id) || !n.dodeljeno_id;

  const status = async (s, extra = {}) => {
    const { error } = await sb.from('naloge').update({ status: s, ...extra }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast('Status: ' + STATUSI[s].l);
  };
  const prevzemi = async () => {
    const { error } = await sb.from('naloge').update({ dodeljeno_id: me.id }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast('Nalog je zdaj tvoj');
  };
  const obracun = async (da) => {
    const { error } = await sb.from('naloge').update(da ? { obracunano_at: new Date().toISOString(), obracunal_id: me.id } : { obracunano_at: null, obracunal_id: null }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast(da ? 'Označeno kot obračunano' : 'Vrnjeno med neobračunane');
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
              <h4>Opis izvedbe del</h4>
              <p>{n.porocilo || <em>Brez opisa.</em>}</p>
              <small>Zaključeno {fCas(n.opravljeno_at)}</small>
            </div>
          )}
          {n.status === 'opravljena' && n.za_racun && <ObracunFaze n={n} />}
          <DelovniNalog n={n} />
          {n.status !== 'opravljena' && n.porocilo && (
            <div className="porocilo opomba"><h4>Opomba s terena</h4><p>{n.porocilo}</p></div>
          )}

          <Datoteke nalogaId={n.id} objektId={n.objekt_id} />
          <Komentarji nalogaId={n.id} />
        </div>

        <aside className="podrobno-stran">
          <dl className="lastnosti">
            <dt>Objekt</dt>
            <dd>{obj ? <><a onClick={() => { onClose(); odpriObjekt(obj.id); }}>{obj.naziv}</a><br /><small>{obj.naslov}, {obj.kraj}</small><br /><a href={mapsUrl(obj)} target="_blank" rel="noreferrer" className="mala-povezava"><MapPin size={13} className="ik" /> Navigacija</a></> : n.lokacija ? <>{n.lokacija}<br /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.lokacija)}`} target="_blank" rel="noreferrer" className="mala-povezava"><MapPin size={13} className="ik" /> Navigacija</a></> : '–'}</dd>
            {nap && <><dt>Naprava</dt><dd>{nap.tip}<br /><small>{nap.proizvajalec} {nap.model} · {nap.lokacija}</small></dd></>}
            <dt>Dodeljeno</dt>
            <dd className="dodeljeni-seznam">{dodVsi.length ? dodVsi.map((p) => <span key={p.id} className="oseba"><Avatar p={p} size={22} /> {p.ime}</span>) : <span className="sivo">Nedodeljeno</span>}</dd>
            <dt>Rok</dt><dd className={zamuja(n) ? 'rdece' : ''}>{fDatum(n.rok)}</dd>
            {n.termin && <><dt>Termin</dt><dd>{fCas(n.termin)}</dd></>}
            <dt>Prijavil</dt>
            <dd>{n.prijavitelj || '–'}{n.prijavitelj_kontakt && <><br />{/^[\d +/]+$/.test(n.prijavitelj_kontakt) ? <a href={'tel:' + n.prijavitelj_kontakt.replace(/\s/g, '')}><Phone size={13} className="ik" /> {n.prijavitelj_kontakt}</a> : <a href={'mailto:' + n.prijavitelj_kontakt}><Mail size={13} className="ik" /> {n.prijavitelj_kontakt}</a>}</>}</dd>
            <dt>Vir</dt><dd>{n.vir}</dd>
            <dt>Ustvaril</dt><dd>{ust?.ime || '–'}<br /><small>{fCas(n.created_at)}</small></dd>
          </dl>
          {lahkoUreja && <button className="gumb polna" onClick={() => setUredi(true)}><Pencil size={15} /> Uredi nalog</button>}
          <button className="gumb polna" onClick={() => natisniNalog(n, { obj, nap, dod, dodVsi, ust, profili })}><Printer size={15} /> Natisni / PDF</button>
          {me.vloga === 'vodja' && <button className="gumb polna nevarno" onClick={izbrisi}>Izbriši</button>}
        </aside>
      </div>
      {uredi && <NalogaObrazec naloga={n} onClose={() => setUredi(false)} />}
      {zakljuci && <ZakljuciObrazec n={n} onClose={() => setZakljuci(false)} />}
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
    for (const izvorna of files) {
      const file = await stisniSliko(izvorna);
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
  const { objekti, profili, me, toast, osvezi } = useData();
  const [f, setF] = useState({ objekt_id: '', lokacija: '', naslov: '', prijavitelj: '', prijavitelj_kontakt: '', nujno: false, izvajalci: [], za_racun: true });
  const [fotke, setFotke] = useState([]);
  const [shranjujem, setShranjujem] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const drugo = f.objekt_id === 'drugo';
  const zapis = () => ({
    naslov: f.naslov.trim(), objekt_id: drugo ? null : f.objekt_id || null, lokacija: drugo ? f.lokacija.trim() || null : null,
    prijavitelj: f.prijavitelj || null, prijavitelj_kontakt: f.prijavitelj_kontakt || null,
    prioriteta: f.nujno ? 'nujno' : 'normalna', dodeljeno_id: f.izvajalci[0] || null, sodelavci: f.izvajalci.slice(1), vir: 'telefon',
    status: f.izvajalci.length ? 'dodeljena' : 'odprta', rok: f.nujno ? isoDan(new Date()) : null, za_racun: f.za_racun,
  });
  const shrani = async (e) => {
    e.preventDefault();
    if (!f.naslov.trim()) return;
    if (drugo && !f.lokacija.trim()) return toast('Vpiši naslov / stranko za »Drugo«.', true);
    setShranjujem(true);
    const { data, error } = await sb.from('naloge').insert(zapis()).select().single();
    if (error) { setShranjujem(false); return toast('Napaka: ' + error.message, true); }
    if (fotke.length) { try { await naloziFotografije(data, fotke, me.id); } catch (err) { toast('Nalog je shranjen, fotografije pa ne: ' + err.message, true); } }
    setShranjujem(false);
    toast(`Nalog #${data.id} vnesen`);
    osvezi(); onClose();
  };
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
            <option value="drugo">➕ Drugo / nova stranka …</option>
          </select>
        </Polje>
        {drugo && <Polje label="Naslov in stranka *"><input value={f.lokacija} onChange={set('lokacija')} placeholder="npr. Novak, Cesta 5, Brežice" /></Polje>}
        <div className="dva">
          <Polje label="Kdo kliče"><input value={f.prijavitelj} onChange={set('prijavitelj')} placeholder="Ime / stanovanje" /></Polje>
          <Polje label="Telefon"><input type="tel" value={f.prijavitelj_kontakt} onChange={set('prijavitelj_kontakt')} placeholder="041 …" /></Polje>
        </div>
        <button type="button" className={'nujno-gumb' + (f.nujno ? ' on' : '')} onClick={() => setF({ ...f, nujno: !f.nujno })}>
          <AlertTriangle size={18} /> {f.nujno ? 'NUJNO – rok danes' : 'Označi kot nujno'}
        </button>
        <div className="polje">
          <span>Pošlji delavcem (neobvezno, lahko več)</span>
          <DelavciIzbira profili={profili} izbrani={f.izvajalci} onChange={(x) => setF({ ...f, izvajalci: x })} samoTeren />
        </div>
        <div className="polje"><span>Način</span><NacinIzbira zaRacun={f.za_racun} onChange={(v) => setF({ ...f, za_racun: v })} /></div>
        <div className="polje"><span>Fotografija</span><FotoIzbira datoteke={fotke} setDatoteke={setFotke} /></div>
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

/* ---------- Faze obračuna ---------- */
export function ObracunFaze({ n }) {
  const { me, profili, toast } = useData();
  const pisarna = me.vloga !== 'teren';
  const [racun, setRacun] = useState(n.stevilka_racuna || '');
  const ime = (id) => profili.find((p) => p.id === id)?.ime || '';
  const faza = n.obracunano_at ? 3 : n.pregledano_at ? 2 : 1;
  const posodobi = async (z, sporocilo) => {
    const { error } = await sb.from('naloge').update(z).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast(sporocilo);
  };
  return (
    <div className="obracun-faze">
      <ol className="faze">
        <li className={faza >= 1 ? 'on' : ''}><span>1</span>Zaključen<small>{fDatum(n.opravljeno_at)}</small></li>
        <li className={faza >= 2 ? 'on' : ''}><span>2</span>Pregledan<small>{n.pregledano_at ? `${fDatum(n.pregledano_at)} · ${ime(n.pregledal_id).split(' ')[0]}` : 'čaka računovodstvo'}</small></li>
        <li className={faza >= 3 ? 'on' : ''}><span>3</span>Zaračunan<small>{n.obracunano_at ? `${n.stevilka_racuna ? 'račun ' + n.stevilka_racuna : fDatum(n.obracunano_at)}` : '–'}</small></li>
      </ol>
      {pisarna && (
        <div className="faze-akcije">
          {faza === 1 && <button className="gumb uspeh mali" onClick={() => posodobi({ pregledano_at: new Date().toISOString(), pregledal_id: me.id }, 'Označeno kot pregledano')}><Check size={14} /> Pregledano – cene in postavke so pravilne</button>}
          {faza === 2 && <>
            <input value={racun} onChange={(e) => setRacun(e.target.value)} placeholder="Številka računa" className="racun-vnos" />
            <button className="gumb uspeh mali" onClick={() => posodobi({ obracunano_at: new Date().toISOString(), obracunal_id: me.id, stevilka_racuna: racun || null }, 'Označeno kot zaračunano')}><Check size={14} /> Zaračunano</button>
            <button className="gumb mali" onClick={() => posodobi({ pregledano_at: null, pregledal_id: null }, 'Vrnjeno v pregled')}>Vrni v pregled</button>
          </>}
          {faza === 3 && <button className="gumb mali" onClick={() => posodobi({ obracunano_at: null, obracunal_id: null }, 'Vrnjeno med nezaračunane')}>Razveljavi »zaračunano«</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Tiskanje delovnega naloga po vzoru papirnatega obrazca ---------- */
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export async function natisniNalog(n, { obj, nap, dod, dodVsi = [], ust, profili = [] }) {
  const w = window.open('', '_blank');
  if (!w) return alert('Brskalnik je blokiral novo okno. Dovoli pojavna okna za to stran.');
  w.document.write('<p style="font:14px Arial;padding:20px">Pripravljam delovni nalog …</p>');
  const [d, m] = await Promise.all([
    sb.from('naloga_delo').select('*').eq('naloga_id', n.id).order('datum').order('id'),
    sb.from('naloga_material').select('*').eq('naloga_id', n.id).order('id'),
  ]);
  const delo = d.data || [], mat = m.data || [];
  let podpis = '';
  if (n.podpis_pot) { const { data } = await sb.storage.from('dokumenti').createSignedUrl(n.podpis_pot, 600); podpis = data?.signedUrl || ''; }
  const s = izracun(delo, mat, n.ddv_delez_95);
  // logo vgradimo neposredno v dokument, da je zagotovo na izpisu
  let logo = new URL('ikone/logo-polni.png', location.href).href;
  try {
    const b = await (await fetch(logo)).blob();
    logo = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  } catch {}
  const ime = (id) => profili.find((p) => p.id === id)?.ime || '';
  const st = (x) => x == null ? '' : Number(x).toLocaleString('sl-SI', { maximumFractionDigits: 2 });
  const eur = (x) => x ? fEur(x) : '';
  const prazne = (k, stolpcev, prvaSirina = 1) => Array.from({ length: Math.max(0, k) }, () => `<tr><td colspan="${prvaSirina}">&nbsp;</td>${'<td></td>'.repeat(stolpcev - 1)}</tr>`).join('');
  const del = delo.map((x) => `<tr><td>${fDatum(x.datum)}</td><td>${esc(ime(x.izvajalec_id))}</td><td>${x.od ? x.od.slice(0, 5) + '–' + (x.do || '').slice(0, 5) : ''}</td><td class="d">${st(x.ure)}</td><td class="d">${eur(x.cena)}</td><td class="d">${eur((x.ure || 0) * (x.cena || 0))}</td></tr>`).join('') + prazne(4 - delo.length, 6);
  const mt = mat.map((x) => `<tr><td colspan="3">${esc(x.naziv)}</td><td class="d">${st(x.kolicina)} ${esc(x.enota || '')}</td><td class="d">${eur(x.cena)}</td><td class="d">${eur((x.kolicina || 0) * (x.cena || 0))}</td></tr>`).join('') + prazne(4 - mat.length, 4, 3);
  const sestavil = ime(n.pregledal_id);
  const html = `<!DOCTYPE html><html lang="sl"><head><meta charset="utf-8"><title>Delovni nalog ${n.id}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font: 9.5pt/1.3 Arial, sans-serif; color: #000; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #555; padding: 3px 5px; vertical-align: top; text-align: left; }
  th { background: #eef2f6; font-weight: bold; font-size: 8.5pt; }
  .d { text-align: right; white-space: nowrap; }
  .glava td { border: none; padding: 0; vertical-align: middle; }
  .glava img { height: 62px; }
  .naslov { text-align: right; } .naslov b { font-size: 16pt; letter-spacing: .5px; display: block; } .naslov span { font-size: 12pt; }
  .naslovnik { font-size: 8.5pt; color: #333; }
  .lbl { width: 14%; background: #f6f8fa; font-weight: bold; font-size: 8.5pt; }
  .sekcija { margin-top: 7px; }
  .sekcija > caption { text-align: left; font-weight: bold; padding: 3px 0; caption-side: top; }
  .opis { min-height: 60px; white-space: pre-wrap; }
  .skupaj td { font-weight: bold; background: #eef2f6; }
  .podpis { height: 62px; } .podpis img { max-height: 56px; max-width: 220px; }
  .mali { font-size: 8pt; color: #444; }
</style></head><body>
<table class="glava"><tr>
  <td><img src="${logo}" alt="DOMtim"><div class="naslovnik">Hrastinska pot 36, Brežice · info: 05 99 22 140</div></td>
  <td class="naslov"><b>DELOVNI NALOG</b><span>št. ${n.id}</span></td>
</tr></table>
<table class="sekcija">
  <tr><td class="lbl">Naročnik</td><td colspan="5">${esc(n.narocnik)}</td><td class="lbl">ID št.</td><td>${esc(n.narocnik_id_st)}</td></tr>
  <tr><td class="lbl">Naročeno dne</td><td>${fDatum(n.created_at)}</td><td class="lbl">Začeto dne</td><td>${n.zacetek_at ? fDatum(n.zacetek_at) : ''}</td><td class="lbl">Končano dne</td><td>${n.opravljeno_at ? fDatum(n.opravljeno_at) : ''}</td><td class="lbl">SM</td><td>${esc(n.sm)}</td></tr>
  <tr><td class="lbl">Datum izpolnitve</td><td>${n.datum_izpolnitve ? fDatum(n.datum_izpolnitve) : ''}</td><td class="lbl">Način</td><td colspan="3">${n.za_racun ? 'Zaračuna se' : 'Delo po pogodbi'}</td><td class="lbl">E-pošta</td><td>${esc(n.email_stranke)}</td></tr>
  <tr><td class="lbl">Objekt / stan. / posl. pr.</td><td colspan="5">${obj ? esc(obj.naziv + ', ' + obj.naslov + ', ' + obj.kraj) : esc(n.lokacija)}${nap ? '<br><span class="mali">' + esc(nap.tip + ' ' + (nap.proizvajalec || '') + ' ' + (nap.model || '')) + '</span>' : ''}</td><td class="lbl">DDV</td><td>${s.delez95 >= 100 ? '9,5 %' : s.delez95 <= 0 ? '22 %' : String(s.delez95).replace('.', ',') + ' % po 9,5 %'}</td></tr>
  <tr><td class="lbl">Prijavil</td><td colspan="3">${esc([n.prijavitelj, n.prijavitelj_kontakt].filter(Boolean).join(', '))}</td><td class="lbl">Kontakt. oseba</td><td colspan="3">${esc(n.kontaktna_oseba)}</td></tr>
  <tr><td class="lbl">Izvajalec</td><td colspan="7">${esc([...new Set([...dodVsi.map((p) => p.ime), ...delo.map((x) => ime(x.izvajalec_id))].filter(Boolean))].join(', '))}</td></tr>
</table>
<table class="sekcija"><caption>OPIS NAROČILA / IZVEDBE DEL</caption><tr><td class="opis"><b>${esc(n.naslov)}</b>${n.opis ? '\n' + esc(n.opis) : ''}${n.porocilo ? '\n\nIzvedeno: ' + esc(n.porocilo) : ''}</td></tr></table>
<table class="sekcija"><caption>I. SPECIFIKACIJA DELA</caption>
  <tr><th>Datum</th><th>Izvajalec (ime in priimek)</th><th>Čas (od – do)</th><th class="d">Ure skupaj</th><th class="d">Cena/enoto</th><th class="d">Vrednost (brez DDV)</th></tr>
  ${del}
  <tr class="skupaj"><td colspan="5">Skupaj vrednost opravljenega dela (brez DDV) v EUR</td><td class="d">${eur(s.delo)}</td></tr>
</table>
<table class="sekcija"><caption>II. SPECIFIKACIJA MATERIALA</caption>
  <tr><th colspan="3">Naziv materiala</th><th class="d">Količina</th><th class="d">Cena/enoto</th><th class="d">Vrednost (brez DDV)</th></tr>
  ${mt}
  <tr class="skupaj"><td colspan="5">Skupaj vrednost materiala (brez DDV) v EUR</td><td class="d">${eur(s.material)}</td></tr>
</table>
<table class="sekcija">
  <tr class="skupaj"><td colspan="5">SKUPAJ VREDNOST STORITVE (I. delo + II. mat.) – osnova brez DDV</td><td class="d">${eur(s.osnova)}</td></tr>
  <tr><td class="lbl">osnova za 9,5 %</td><td class="d">${eur(s.osnove[9.5])}</td><td class="lbl">znesek DDV 9,5 %</td><td class="d">${eur(s.ddv[9.5])}</td><td class="lbl">∑ osn. + DDV 9,5 %</td><td class="d">${eur(s.osnove[9.5] + s.ddv[9.5])}</td></tr>
  <tr><td class="lbl">osnova za 22 %</td><td class="d">${eur(s.osnove[22])}</td><td class="lbl">znesek DDV 22 %</td><td class="d">${eur(s.ddv[22])}</td><td class="lbl">∑ osn. + DDV 22 %</td><td class="d">${eur(s.osnove[22] + s.ddv[22])}</td></tr>
  <tr class="skupaj"><td colspan="5">SKUPAJ (osnova + DDV)</td><td class="d">${eur(s.skupaj)}</td></tr>
</table>
<table class="sekcija"><caption>PRIMOPREDAJA DEL</caption>
  <tr><th>Izvajalec (ime in priimek / podpis / žig)</th><th>Naročnik – prevzemnik (ime in priimek / podpis / žig)</th><th>Datum</th></tr>
  <tr><td class="podpis">${esc(dodVsi.map((p) => p.ime).join(', '))}</td><td class="podpis">${podpis ? `<img src="${podpis}" alt="podpis"><br>` : ''}${esc(n.podpis_ime || '')}${n.podpis_status === 'ni_prisoten' ? '<span class="mali">Stranka ni bila prisotna</span>' : ''}</td><td>${n.podpis_at ? fCas(n.podpis_at) : n.opravljeno_at ? fDatum(n.opravljeno_at) : ''}</td></tr>
</table>
<table class="sekcija"><caption>OBRAČUN DEL</caption>
  <tr><th>Obračun sestavil (ime in priimek / podpis)</th><th>Datum</th><th>Številka računa</th></tr>
  <tr><td style="height:34px">${esc(sestavil)}</td><td>${n.pregledano_at ? fDatum(n.pregledano_at) : ''}</td><td>${esc(n.stevilka_racuna)}</td></tr>
</table>
<p class="mali">Izpisano iz aplikacije DOMtim, ${new Date().toLocaleString('sl-SI')}</p>
<script>Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); }))).then(() => setTimeout(() => window.print(), 300));<\/script>
</body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
}
