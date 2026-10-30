import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  sb, STATUSI, AKTIVNI, PRIORITETE, KATEGORIJE, MAPE, MAPA_IKONA, KAT_IKONA,
  fDatum, fDatumKratko, fUra, fRelativno, fVelikost, fMinute, isoDan, danes, zamuja, rokDanes, dniDo, sortNaloge, varnoIme, mapsUrl,
} from './lib.js';
import { useData, Status, Prio, Kat, Avatar, Prazno, Kartica, Modal, Polje } from './ui.jsx';
import { Datoteke, odpriDatoteko } from './naloga.jsx';

/* ---------- Vrstica naloga ---------- */
export function NalogaVrstica({ n, kompaktno }) {
  const { profili, objekti, odpriNalogo } = useData();
  const obj = objekti.find((o) => o.id === n.objekt_id);
  const dod = profili.find((p) => p.id === n.dodeljeno_id);
  return (
    <div className={'naloga-vrstica' + (zamuja(n) ? ' zamuja' : '') + ' p-' + n.prioriteta} onClick={() => odpriNalogo(n.id)}>
      <div className="nv-glavno">
        <div className="nv-naslov"><span className="st-naloga">#{n.id}</span> {n.naslov}</div>
        <div className="nv-meta">
          <span>{KAT_IKONA[n.kategorija]} {obj ? obj.naziv : 'Splošno'}</span>
          {n.rok && <span className={zamuja(n) ? 'rdece' : rokDanes(n) ? 'oranzno' : ''}>📅 {zamuja(n) ? 'zamuja · ' : rokDanes(n) ? 'danes · ' : ''}{fDatumKratko(n.rok)}</span>}
          {n.termin && <span>🕘 {fDatumKratko(n.termin)} {fUra(n.termin)}</span>}
        </div>
      </div>
      <div className="nv-desno">
        <Prio p={n.prioriteta} kratko />
        {!kompaktno && <Status s={n.status} />}
        <Avatar p={dod} size={26} />
      </div>
    </div>
  );
}

/* ---------- PREGLED (nadzorna plošča) ---------- */
export function Pregled() {
  const { naloge, profili, naprave, objekti, me, novaNaloga, pojdi } = useData();
  const aktivne = naloge.filter((n) => AKTIVNI.includes(n.status));
  const nujne = aktivne.filter((n) => n.prioriteta === 'nujno');
  const zamujene = aktivne.filter(zamuja);
  const nedodeljene = aktivne.filter((n) => !n.dodeljeno_id);
  const tedenZac = danes(); tedenZac.setDate(tedenZac.getDate() - ((tedenZac.getDay() + 6) % 7));
  const opravljeneTeden = naloge.filter((n) => n.status === 'opravljena' && new Date(n.opravljeno_at) >= tedenZac);
  const pregledi = naprave.filter((x) => x.naslednji_pregled && dniDo(x.naslednji_pregled) <= 30).sort((a, b) => a.naslednji_pregled.localeCompare(b.naslednji_pregled));
  const teren = profili.filter((p) => p.vloga === 'teren');
  const zadnje = [...naloge].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);
  const ura = new Date().getHours();
  const pozdrav = ura < 10 ? 'Dobro jutro' : ura < 18 ? 'Dober dan' : 'Dober večer';

  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>{pozdrav}, {me.ime.split(' ')[0]}</h1><p className="podnaslov">{new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })} · {aktivne.length} aktivnih nalogov</p></div>
        <button className="gumb primarni" onClick={() => novaNaloga()}>+ Nov nalog</button>
      </div>

      <div className="kpi-vrsta">
        <button className="kpi kpi-rdec" onClick={() => pojdi('naloge', { prioriteta: 'nujno' })}><b>{nujne.length}</b><span>Nujnih</span></button>
        <button className="kpi kpi-oranzen" onClick={() => pojdi('naloge', { zamuja: true })}><b>{zamujene.length}</b><span>Zamuja z rokom</span></button>
        <button className="kpi" onClick={() => pojdi('naloge', { dodeljeno: 'nihce' })}><b>{nedodeljene.length}</b><span>Nedodeljenih</span></button>
        <button className="kpi kpi-zelen" onClick={() => pojdi('naloge', { status: 'opravljena' })}><b>{opravljeneTeden.length}</b><span>Opravljenih ta teden</span></button>
      </div>

      <div className="mreza-2">
        <Kartica naslov="⚠ Zahteva pozornost" desno={<a onClick={() => pojdi('naloge')}>Vse naloge →</a>}>
          {[...new Set([...nujne, ...zamujene, ...nedodeljene])].sort(sortNaloge).slice(0, 7).map((n) => <NalogaVrstica key={n.id} n={n} />)}
          {!nujne.length && !zamujene.length && !nedodeljene.length && <Prazno>Vse je pod nadzorom.</Prazno>}
        </Kartica>

        <Kartica naslov="👷 Obremenitev terenske ekipe" desno={<a onClick={() => pojdi('plan')}>Tedenski plan →</a>}>
          <div className="ekipa-obremenitev">
            {teren.map((p) => {
              const moje = aktivne.filter((n) => n.dodeljeno_id === p.id);
              const vTeku = moje.find((n) => n.status === 'v_teku');
              const obj = vTeku && objekti.find((o) => o.id === vTeku.objekt_id);
              return (
                <div key={p.id} className="delavec">
                  <Avatar p={p} size={38} />
                  <div className="delavec-info">
                    <b>{p.ime}</b><small>{p.delovno_mesto}</small>
                    <div className="trenutno">{vTeku ? <>🟠 Zdaj: {vTeku.naslov}{obj ? ` (${obj.naziv})` : ''}</> : <span className="sivo">Ni naloga v teku</span>}</div>
                  </div>
                  <div className="delavec-st" onClick={() => pojdi('naloge', { dodeljeno: p.id })}>
                    <b>{moje.length}</b><small>odprtih</small>
                    {moje.some((n) => n.prioriteta === 'nujno') && <span className="pika-rdeca" title="Ima nujne naloge" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Kartica>

        <Kartica naslov="🔥 Pregledi naprav (30 dni)" desno={<a onClick={() => pojdi('naprave')}>Vse naprave →</a>}>
          {pregledi.length ? (
            <ul className="seznam-pregledov">
              {pregledi.map((x) => {
                const d = dniDo(x.naslednji_pregled); const o = objekti.find((y) => y.id === x.objekt_id);
                return (
                  <li key={x.id} onClick={() => pojdi('naprave')}>
                    <div><b>{x.tip}</b><small>{o?.naziv} · {x.proizvajalec}</small></div>
                    <span className={'dni ' + (d < 0 ? 'rdece' : d <= 7 ? 'oranzno' : '')}>{d < 0 ? `zamuda ${-d} dni` : d === 0 ? 'danes' : `čez ${d} dni`}</span>
                  </li>
                );
              })}
            </ul>
          ) : <Prazno>V naslednjih 30 dneh ni pregledov.</Prazno>}
        </Kartica>

        <Kartica naslov="🕘 Nedavne spremembe">
          {zadnje.map((n) => <NalogaVrstica key={n.id} n={n} />)}
        </Kartica>
      </div>
    </div>
  );
}

/* ---------- NALOGE (seznam + tabla) ---------- */
export function Naloge({ filterZacetni = {} }) {
  const { naloge, profili, objekti, novaNaloga, odpriNalogo } = useData();
  const [pogled, setPogled] = useState(() => localStorage.getItem('pogled') || 'seznam');
  const [f, setF] = useState({ iskanje: '', status: 'aktivne', kategorija: '', dodeljeno: '', objekt: '', prioriteta: '', zamuja: false, za_racun: false, ...filterZacetni });
  useEffect(() => { setF((x) => ({ ...x, ...filterZacetni, status: filterZacetni.status || 'aktivne' })); }, [JSON.stringify(filterZacetni)]);
  useEffect(() => { try { localStorage.setItem('pogled', pogled); } catch {} }, [pogled]);

  const filtrirane = useMemo(() => {
    const q = f.iskanje.toLowerCase();
    return naloge.filter((n) => {
      if (pogled === 'seznam') {
        if (f.status === 'aktivne' && !AKTIVNI.includes(n.status)) return false;
        if (f.status !== 'aktivne' && f.status !== 'vse' && n.status !== f.status) return false;
      }
      if (f.kategorija && n.kategorija !== f.kategorija) return false;
      if (f.prioriteta && n.prioriteta !== f.prioriteta) return false;
      if (f.dodeljeno === 'nihce' ? n.dodeljeno_id : f.dodeljeno && n.dodeljeno_id !== f.dodeljeno) return false;
      if (f.objekt && String(n.objekt_id) !== String(f.objekt)) return false;
      if (f.zamuja && !zamuja(n)) return false;
      if (f.za_racun && !n.za_racun) return false;
      if (q) {
        const o = objekti.find((x) => x.id === n.objekt_id);
        const hay = `${n.id} ${n.naslov} ${n.opis || ''} ${n.prijavitelj || ''} ${o?.naziv || ''} ${o?.naslov || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort(f.status === 'opravljena' ? (a, b) => (b.opravljeno_at || '').localeCompare(a.opravljeno_at || '') : sortNaloge);
  }, [naloge, f, pogled, objekti]);

  const aktivnihFiltrov = ['kategorija', 'dodeljeno', 'objekt', 'prioriteta'].filter((k) => f[k]).length + (f.zamuja ? 1 : 0) + (f.za_racun ? 1 : 0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>Delovni nalogi</h1><p className="podnaslov">{filtrirane.length} prikazanih</p></div>
        <div className="glava-desno">
          <div className="segment">
            <button className={pogled === 'seznam' ? 'on' : ''} onClick={() => setPogled('seznam')}>☰ Seznam</button>
            <button className={pogled === 'tabla' ? 'on' : ''} onClick={() => setPogled('tabla')}>▦ Tabla</button>
          </div>
          <button className="gumb primarni" onClick={() => novaNaloga()}>+ Nov nalog</button>
        </div>
      </div>

      <div className="filtri">
        <input className="iskanje" placeholder="🔍 Išči po naslovu, objektu, prijavitelju, št. naloga …" value={f.iskanje} onChange={set('iskanje')} />
        {pogled === 'seznam' && (
          <select value={f.status} onChange={set('status')}>
            <option value="aktivne">Aktivne</option><option value="vse">Vse</option>
            {Object.entries(STATUSI).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
        )}
        <select value={f.dodeljeno} onChange={set('dodeljeno')}>
          <option value="">Vsi delavci</option><option value="nihce">Nedodeljeno</option>
          {profili.map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}
        </select>
        <select value={f.objekt} onChange={set('objekt')}>
          <option value="">Vsi objekti</option>
          {objekti.map((o) => <option key={o.id} value={o.id}>{o.naziv}</option>)}
        </select>
        <select value={f.kategorija} onChange={set('kategorija')}>
          <option value="">Vse kategorije</option>{KATEGORIJE.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select value={f.prioriteta} onChange={set('prioriteta')}>
          <option value="">Vse prioritete</option>{Object.entries(PRIORITETE).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        <label className="cip"><input type="checkbox" checked={f.zamuja} onChange={(e) => setF({ ...f, zamuja: e.target.checked })} /> Zamuja</label>
        <label className="cip"><input type="checkbox" checked={f.za_racun} onChange={(e) => setF({ ...f, za_racun: e.target.checked })} /> Za obračun</label>
        {aktivnihFiltrov > 0 && <button className="gumb mali" onClick={() => setF({ iskanje: '', status: 'aktivne', kategorija: '', dodeljeno: '', objekt: '', prioriteta: '', zamuja: false, za_racun: false })}>Počisti filtre</button>}
      </div>

      {pogled === 'seznam' ? (
        <div className="kartica brez-roba">
          {filtrirane.length ? (
            <table className="tabela">
              <thead><tr><th>Št.</th><th>Naloga</th><th>Objekt</th><th>Status</th><th>Prioriteta</th><th>Rok</th><th>Dodeljeno</th></tr></thead>
              <tbody>
                {filtrirane.map((n) => {
                  const o = objekti.find((x) => x.id === n.objekt_id); const p = profili.find((x) => x.id === n.dodeljeno_id);
                  return (
                    <tr key={n.id} onClick={() => odpriNalogo(n.id)} className={zamuja(n) ? 'zamuja' : ''}>
                      <td className="st-naloga">#{n.id}</td>
                      <td><b>{n.naslov}</b><div className="pod">{KAT_IKONA[n.kategorija]} {n.kategorija}{n.za_racun ? ' · 💶' : ''}</div></td>
                      <td>{o?.naziv || <span className="sivo">–</span>}</td>
                      <td><Status s={n.status} /></td>
                      <td><Prio p={n.prioriteta} /></td>
                      <td className={zamuja(n) ? 'rdece' : ''}>{n.status === 'opravljena' ? <span className="sivo">✓ {fDatumKratko(n.opravljeno_at)}</span> : fDatum(n.rok)}</td>
                      <td>{p ? <span className="oseba"><Avatar p={p} size={22} /> {p.ime.split(' ')[0]}</span> : <span className="sivo">–</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <Prazno ikona="🔍">Ni nalogov, ki ustrezajo filtrom.</Prazno>}
        </div>
      ) : (
        <Tabla naloge={filtrirane} />
      )}
    </div>
  );
}

function Tabla({ naloge }) {
  const { toast } = useData();
  const [cez, setCez] = useState(null);
  const stolpci = ['odprta', 'dodeljena', 'v_teku', 'caka', 'opravljena'];
  const premakni = async (id, status) => {
    setCez(null);
    const n = naloge.find((x) => x.id === id);
    if (!n || n.status === status) return;
    const { error } = await sb.from('naloge').update({ status }).eq('id', id);
    if (error) toast('Napaka: ' + error.message, true); else toast(`#${id} → ${STATUSI[status].l}`);
  };
  return (
    <div className="tabla">
      {stolpci.map((s) => {
        let v = naloge.filter((n) => n.status === s).sort(sortNaloge);
        if (s === 'opravljena') v = v.sort((a, b) => (b.opravljeno_at || '').localeCompare(a.opravljeno_at || '')).slice(0, 15);
        return (
          <div key={s} className={'stolpec' + (cez === s ? ' cez' : '')}
            onDragOver={(e) => { e.preventDefault(); setCez(s); }} onDragLeave={() => setCez(null)}
            onDrop={(e) => premakni(+e.dataTransfer.getData('id'), s)}>
            <div className="stolpec-glava" style={{ '--c': STATUSI[s].c }}><i />{STATUSI[s].l}<span>{v.length}</span></div>
            {v.map((n) => (
              <div key={n.id} draggable onDragStart={(e) => e.dataTransfer.setData('id', n.id)}>
                <NalogaVrstica n={n} kompaktno />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- MOJE NALOGE (terenski pogled) ---------- */
export function Moje() {
  const { naloge, objekti, me, odpriNalogo, novaNaloga, toast } = useData();
  const [zavihek, setZavihek] = useState('danes');
  const moje = naloge.filter((n) => n.dodeljeno_id === me.id);
  const aktivne = moje.filter((n) => AKTIVNI.includes(n.status)).sort(sortNaloge);
  const danesIso = isoDan(new Date());
  const zaDanes = aktivne.filter((n) => n.status === 'v_teku' || zamuja(n) || n.prioriteta === 'nujno' || (n.rok && n.rok <= danesIso) || (n.termin && isoDan(n.termin) === danesIso));
  const kasneje = aktivne.filter((n) => !zaDanes.includes(n));
  const prosto = naloge.filter((n) => !n.dodeljeno_id && AKTIVNI.includes(n.status)).sort(sortNaloge);
  const opravljeno = moje.filter((n) => n.status === 'opravljena').sort((a, b) => b.opravljeno_at.localeCompare(a.opravljeno_at)).slice(0, 15);
  const seznam = { danes: zaDanes, kasneje, prosto, opravljeno }[zavihek];

  const hitro = async (e, n, status) => {
    e.stopPropagation();
    const { error } = await sb.from('naloge').update(status === 'prevzemi' ? { dodeljeno_id: me.id } : { status }).eq('id', n.id);
    if (error) toast('Napaka: ' + error.message, true); else toast(status === 'prevzemi' ? 'Prevzeto' : 'Začeto');
  };

  return (
    <div className="stran teren">
      <div className="stran-glava">
        <div><h1>Moje naloge</h1><p className="podnaslov">{aktivne.length} odprtih · {opravljeno.filter((n) => isoDan(n.opravljeno_at) === danesIso).length} opravljenih danes</p></div>
        <button className="gumb" onClick={() => novaNaloga({ dodeljeno_id: me.id, vir: 'osebno' })}>+ Prijavi okvaro</button>
      </div>
      <div className="zavihki">
        {[['danes', 'Za danes', zaDanes.length], ['kasneje', 'Kasneje', kasneje.length], ['prosto', 'Nedodeljeno', prosto.length], ['opravljeno', 'Opravljeno', null]].map(([k, l, c]) => (
          <button key={k} className={zavihek === k ? 'on' : ''} onClick={() => setZavihek(k)}>{l}{c != null && <span>{c}</span>}</button>
        ))}
      </div>
      <div className="teren-seznam">
        {seznam.map((n) => {
          const o = objekti.find((x) => x.id === n.objekt_id);
          return (
            <div key={n.id} className={'teren-kartica p-' + n.prioriteta + (zamuja(n) ? ' zamuja' : '')} onClick={() => odpriNalogo(n.id)}>
              <div className="tk-vrh"><Status s={n.status} /><Prio p={n.prioriteta} kratko />{zamuja(n) && <span className="prio prio-nujno">Zamuja</span>}<span className="st-naloga">#{n.id}</span></div>
              <h3>{KAT_IKONA[n.kategorija]} {n.naslov}</h3>
              {o && <div className="tk-naslov">📍 {o.naslov}, {o.kraj}</div>}
              {n.opis && <p className="tk-opis">{n.opis}</p>}
              <div className="tk-meta">
                {n.termin && <span>🕘 {fDatumKratko(n.termin)} ob {fUra(n.termin)}</span>}
                {n.rok && <span>📅 rok {fDatumKratko(n.rok)}</span>}
                {n.prijavitelj && <span>👤 {n.prijavitelj}</span>}
              </div>
              {zavihek !== 'opravljeno' && (
                <div className="tk-gumbi" onClick={(e) => e.stopPropagation()}>
                  {o && <a className="gumb" href={mapsUrl(o)} target="_blank" rel="noreferrer">📍 Pot</a>}
                  {n.prijavitelj_kontakt && /^[\d +/]+$/.test(n.prijavitelj_kontakt) && <a className="gumb" href={'tel:' + n.prijavitelj_kontakt.replace(/\s/g, '')}>📞 Pokliči</a>}
                  {zavihek === 'prosto' ? <button className="gumb primarni" onClick={(e) => hitro(e, n, 'prevzemi')}>✋ Prevzemi</button>
                    : n.status !== 'v_teku' ? <button className="gumb primarni" onClick={(e) => hitro(e, n, 'v_teku')}>▶ Začni</button>
                    : <button className="gumb uspeh" onClick={() => odpriNalogo(n.id)}>✓ Zaključi</button>}
                </div>
              )}
              {zavihek === 'opravljeno' && <p className="tk-opis">✓ {fRelativno(n.opravljeno_at)} · {n.porocilo}</p>}
            </div>
          );
        })}
        {!seznam.length && <Prazno ikona={zavihek === 'danes' ? '☕' : '✓'}>{zavihek === 'danes' ? 'Za danes nimaš nalog.' : 'Nič ni tukaj.'}</Prazno>}
      </div>
    </div>
  );
}

/* ---------- TEDENSKI PLAN ---------- */
export function Plan() {
  const { naloge, profili, odpriNalogo, objekti } = useData();
  const [zamik, setZamik] = useState(0);
  const pon = danes(); pon.setDate(pon.getDate() - ((pon.getDay() + 6) % 7) + zamik * 7);
  const dnevi = [...Array(6)].map((_, i) => { const d = new Date(pon); d.setDate(d.getDate() + i); return d; });
  const ljudje = [...profili.filter((p) => p.vloga === 'teren'), ...profili.filter((p) => p.vloga !== 'teren')];
  const dan = (n) => n.termin ? isoDan(n.termin) : n.rok;
  const relevantne = naloge.filter((n) => n.status !== 'preklicana');
  const danIso = isoDan(new Date());
  const brezDatuma = naloge.filter((n) => AKTIVNI.includes(n.status) && !n.rok && !n.termin);

  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>Tedenski plan</h1><p className="podnaslov">Naloge po delavcih in dnevih (po terminu oz. roku)</p></div>
        <div className="segment">
          <button onClick={() => setZamik(zamik - 1)}>‹</button>
          <button className={zamik === 0 ? 'on' : ''} onClick={() => setZamik(0)}>Ta teden</button>
          <button onClick={() => setZamik(zamik + 1)}>›</button>
        </div>
      </div>
      <div className="plan-ovoj">
        <table className="plan">
          <thead><tr><th />{dnevi.map((d) => <th key={+d} className={isoDan(d) === danIso ? 'danes' : ''}>{d.toLocaleDateString('sl-SI', { weekday: 'short' })} <span>{d.getDate()}. {d.getMonth() + 1}.</span></th>)}</tr></thead>
          <tbody>
            {ljudje.map((p) => (
              <tr key={p.id} className={p.vloga !== 'teren' ? 'pisarna-vrsta' : ''}>
                <th><span className="oseba"><Avatar p={p} size={26} /> <span><b>{p.ime}</b><small>{p.delovno_mesto}</small></span></span></th>
                {dnevi.map((d) => {
                  const iso = isoDan(d);
                  const v = relevantne.filter((n) => n.dodeljeno_id === p.id && (dan(n) === iso || (iso === danIso && zamuja(n) && !n.termin))).sort(sortNaloge);
                  return (
                    <td key={iso} className={iso === danIso ? 'danes' : ''}>
                      {v.map((n) => {
                        const o = objekti.find((x) => x.id === n.objekt_id);
                        return (
                          <div key={n.id} className={'plan-naloga s-' + n.status + ' p-' + n.prioriteta + (zamuja(n) ? ' zamuja' : '')} onClick={() => odpriNalogo(n.id)} title={n.naslov}>
                            {n.termin && <b>{fUra(n.termin)} </b>}{n.naslov}
                            {o && <small>{o.naziv}</small>}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {brezDatuma.length > 0 && (
        <Kartica naslov={`Brez roka in termina (${brezDatuma.length})`} className="mt">
          {brezDatuma.sort(sortNaloge).map((n) => <NalogaVrstica key={n.id} n={n} />)}
        </Kartica>
      )}
    </div>
  );
}

/* ---------- OBJEKTI ---------- */
export function Objekti({ izbran }) {
  const { objekti, naloge, profili, pojdi } = useData();
  const [q, setQ] = useState('');
  const [nov, setNov] = useState(false);
  if (izbran) return <ObjektPodrobno id={izbran} />;
  const v = objekti.filter((o) => `${o.naziv} ${o.naslov} ${o.kraj}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>Objekti</h1><p className="podnaslov">{objekti.length} objektov v upravljanju</p></div>
        <button className="gumb primarni" onClick={() => setNov(true)}>+ Nov objekt</button>
      </div>
      <div className="filtri"><input className="iskanje" placeholder="🔍 Išči objekt ali naslov …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="objekti-mreza">
        {v.map((o) => {
          const akt = naloge.filter((n) => n.objekt_id === o.id && AKTIVNI.includes(n.status));
          const up = profili.find((p) => p.id === o.upravnik_id);
          return (
            <div key={o.id} className="objekt-kartica" onClick={() => pojdi('objekti', null, o.id)}>
              <div className="ok-ikona">{o.tip === 'poslovna' ? '🏢' : o.tip === 'enostanovanjska' ? '🏠' : '🏘️'}</div>
              <div className="ok-info">
                <b>{o.naziv}</b><small>{o.naslov}, {o.kraj}</small>
                <div className="ok-meta"><span>{o.tip}</span>{o.st_enot && <span>{o.st_enot} enot</span>}{up && <span>upravnik: {up.ime.split(' ')[0]}</span>}</div>
              </div>
              <div className={'ok-st' + (akt.some((n) => n.prioriteta === 'nujno') ? ' rdece' : '')}><b>{akt.length}</b><small>odprtih</small></div>
            </div>
          );
        })}
      </div>
      {nov && <ObjektObrazec onClose={() => setNov(false)} />}
    </div>
  );
}

function ObjektObrazec({ objekt, onClose }) {
  const { profili, toast, osvezi } = useData();
  const [f, setF] = useState({ naziv: objekt?.naziv || '', naslov: objekt?.naslov || '', kraj: objekt?.kraj || 'Brežice', tip: objekt?.tip || 'večstanovanjska', st_enot: objekt?.st_enot || '', leto_izgradnje: objekt?.leto_izgradnje || '', upravnik_id: objekt?.upravnik_id || '', opombe: objekt?.opombe || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const shrani = async (e) => {
    e.preventDefault();
    const z = { ...f, st_enot: f.st_enot || null, leto_izgradnje: f.leto_izgradnje || null, upravnik_id: f.upravnik_id || null };
    const { error } = objekt ? await sb.from('objekti').update(z).eq('id', objekt.id) : await sb.from('objekti').insert(z);
    if (error) return toast('Napaka: ' + error.message, true);
    toast('Shranjeno'); osvezi(); onClose();
  };
  return (
    <Modal naslov={objekt ? 'Uredi objekt' : 'Nov objekt'} onClose={onClose}>
      <form className="obrazec" onSubmit={shrani}>
        <Polje label="Naziv *" siroko><input required value={f.naziv} onChange={set('naziv')} placeholder="npr. Blok CPB 16" /></Polje>
        <Polje label="Naslov *"><input required value={f.naslov} onChange={set('naslov')} /></Polje>
        <Polje label="Kraj"><input value={f.kraj} onChange={set('kraj')} /></Polje>
        <Polje label="Tip"><select value={f.tip} onChange={set('tip')}>{['večstanovanjska', 'poslovna', 'stanovanjsko-poslovna', 'enostanovanjska'].map((t) => <option key={t}>{t}</option>)}</select></Polje>
        <Polje label="Upravnik"><select value={f.upravnik_id} onChange={set('upravnik_id')}><option value="">—</option>{profili.filter((p) => p.vloga !== 'teren').map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}</select></Polje>
        <Polje label="Št. enot"><input type="number" value={f.st_enot} onChange={set('st_enot')} /></Polje>
        <Polje label="Leto izgradnje"><input type="number" value={f.leto_izgradnje} onChange={set('leto_izgradnje')} /></Polje>
        <Polje label="Opombe (dostop, ključi, posebnosti)" siroko><textarea rows={3} value={f.opombe} onChange={set('opombe')} /></Polje>
        <div className="gumbi siroko"><button type="button" className="gumb" onClick={onClose}>Prekliči</button><button className="gumb primarni">Shrani</button></div>
      </form>
    </Modal>
  );
}

function ObjektPodrobno({ id }) {
  const { objekti, naloge, naprave, profili, me, pojdi, novaNaloga } = useData();
  const [kontakti, setKontakti] = useState([]);
  const [uredi, setUredi] = useState(false);
  const [zgodovina, setZgodovina] = useState(false);
  const o = objekti.find((x) => x.id === id);
  useEffect(() => { sb.from('kontakti').select('*').eq('objekt_id', id).then(({ data }) => setKontakti(data || [])); }, [id]);
  if (!o) return null;
  const vse = naloge.filter((n) => n.objekt_id === id);
  const akt = vse.filter((n) => AKTIVNI.includes(n.status)).sort(sortNaloge);
  const opr = vse.filter((n) => !AKTIVNI.includes(n.status)).sort((a, b) => (b.opravljeno_at || b.updated_at).localeCompare(a.opravljeno_at || a.updated_at));
  const nap = naprave.filter((x) => x.objekt_id === id);
  const up = profili.find((p) => p.id === o.upravnik_id);
  const ure = opr.reduce((s, n) => s + (n.porabljen_cas_min || 0), 0);

  return (
    <div className="stran">
      <a className="nazaj" onClick={() => pojdi('objekti')}>‹ Vsi objekti</a>
      <div className="stran-glava">
        <div><h1>{o.naziv}</h1><p className="podnaslov">{o.naslov}, {o.kraj} · <a href={mapsUrl(o)} target="_blank" rel="noreferrer">📍 zemljevid</a></p></div>
        <div className="glava-desno">
          {me.vloga !== 'teren' && <button className="gumb" onClick={() => setUredi(true)}>✎ Uredi</button>}
          <button className="gumb primarni" onClick={() => novaNaloga({ objekt_id: id })}>+ Nalog za ta objekt</button>
        </div>
      </div>
      <div className="mreza-objekt">
        <div className="stolpec-levi">
          <Kartica naslov={`Odprte naloge (${akt.length})`}>
            {akt.length ? akt.map((n) => <NalogaVrstica key={n.id} n={n} />) : <Prazno>Ni odprtih nalog.</Prazno>}
          </Kartica>
          <Kartica naslov={`Zgodovina del (${opr.length})`} desno={<small className="sivo">skupaj {fMinute(ure)}</small>}>
            {(zgodovina ? opr : opr.slice(0, 5)).map((n) => <NalogaVrstica key={n.id} n={n} />)}
            {opr.length > 5 && <button className="gumb mali polna" onClick={() => setZgodovina(!zgodovina)}>{zgodovina ? 'Prikaži manj' : `Prikaži vseh ${opr.length}`}</button>}
            {!opr.length && <Prazno ikona="📭">Še ni zaključenih del.</Prazno>}
          </Kartica>
          <Kartica><Datoteke objektId={id} naslov="Dokumenti objekta" /></Kartica>
        </div>
        <div className="stolpec-desni">
          <Kartica naslov="Podatki">
            <dl className="lastnosti">
              <dt>Tip</dt><dd>{o.tip}</dd>
              {o.st_enot && <><dt>Enot</dt><dd>{o.st_enot}</dd></>}
              {o.leto_izgradnje && <><dt>Leto izgradnje</dt><dd>{o.leto_izgradnje}</dd></>}
              <dt>Upravnik</dt><dd className="oseba">{up ? <><Avatar p={up} size={22} /> {up.ime}</> : '–'}</dd>
              {o.opombe && <><dt>Opombe</dt><dd>{o.opombe}</dd></>}
            </dl>
          </Kartica>
          <Kartica naslov="Kontakti">
            {kontakti.map((k) => (
              <div key={k.id} className="kontakt">
                <b>{k.ime}</b><small>{k.vloga}</small>
                {k.telefon && <a href={'tel:' + k.telefon.replace(/\s/g, '')}>📞 {k.telefon}</a>}
                {k.email && <a href={'mailto:' + k.email}>✉ {k.email}</a>}
              </div>
            ))}
            {!kontakti.length && <p className="sivo">Ni kontaktov.</p>}
          </Kartica>
          <Kartica naslov="Naprave">
            {nap.map((x) => {
              const d = x.naslednji_pregled ? dniDo(x.naslednji_pregled) : null;
              return (
                <div key={x.id} className="naprava-mini">
                  <b>{x.tip}</b><small>{x.proizvajalec} {x.model}{x.leto ? ` · ${x.leto}` : ''}{x.moc_kw ? ` · ${x.moc_kw} kW` : ''}</small>
                  {d != null && <span className={'dni ' + (d < 0 ? 'rdece' : d <= 30 ? 'oranzno' : '')}>Pregled: {fDatum(x.naslednji_pregled)}</span>}
                </div>
              );
            })}
            {!nap.length && <p className="sivo">Ni vpisanih naprav.</p>}
          </Kartica>
        </div>
      </div>
      {uredi && <ObjektObrazec objekt={o} onClose={() => setUredi(false)} />}
    </div>
  );
}

/* ---------- NAPRAVE IN PREGLEDI ---------- */
export function Naprave() {
  const { naprave, objekti, naloge, novaNaloga, me, toast, osvezi } = useData();
  const [nov, setNov] = useState(false);
  const v = [...naprave].sort((a, b) => (a.naslednji_pregled || '9').localeCompare(b.naslednji_pregled || '9'));
  const imaNalog = (x) => naloge.find((n) => n.naprava_id === x.id && n.kategorija === 'pregled' && AKTIVNI.includes(n.status));
  const zabelezi = async (x) => {
    const { error } = await sb.from('naprave').update({ zadnji_pregled: isoDan(new Date()) }).eq('id', x.id);
    if (error) toast('Napaka: ' + error.message, true); else { toast('Pregled zabeležen'); osvezi(); }
  };
  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>Naprave in redni pregledi</h1><p className="podnaslov">Kurilne naprave, dvigala, klime … s samodejnim izračunom naslednjega pregleda</p></div>
        {me.vloga !== 'teren' && <button className="gumb primarni" onClick={() => setNov(true)}>+ Nova naprava</button>}
      </div>
      <div className="kartica brez-roba">
        <table className="tabela">
          <thead><tr><th>Naprava</th><th>Objekt</th><th>Zadnji pregled</th><th>Naslednji pregled</th><th /></tr></thead>
          <tbody>
            {v.map((x) => {
              const o = objekti.find((y) => y.id === x.objekt_id); const d = x.naslednji_pregled ? dniDo(x.naslednji_pregled) : null; const nal = imaNalog(x);
              return (
                <tr key={x.id} className="brez-klika">
                  <td><b>{x.tip}</b><div className="pod">{x.proizvajalec} {x.model}{x.leto ? ` · l. ${x.leto}` : ''}{x.moc_kw ? ` · ${x.moc_kw} kW` : ''}</div></td>
                  <td>{o?.naziv}<div className="pod">{x.lokacija}</div></td>
                  <td>{fDatum(x.zadnji_pregled)}<div className="pod">vsakih {x.interval_mesecev} mes.</div></td>
                  <td><span className={'dni ' + (d < 0 ? 'rdece' : d <= 30 ? 'oranzno' : 'zeleno')}>{fDatum(x.naslednji_pregled)} · {d < 0 ? `zamuda ${-d} dni` : d === 0 ? 'danes' : `čez ${d} dni`}</span></td>
                  <td className="desno">
                    {nal ? <span className="sivo">Nalog #{nal.id} odprt</span> : (
                      <button className="gumb mali" onClick={() => novaNaloga({ objekt_id: x.objekt_id, naprava_id: x.id, kategorija: 'pregled', vir: 'redni pregled', naslov: `Redni pregled – ${x.tip}`, rok: x.naslednji_pregled, prioriteta: d < 7 ? 'visoka' : 'normalna', za_racun: true })}>+ Nalog za pregled</button>
                    )}
                    {me.vloga !== 'teren' && <button className="gumb mali" onClick={() => zabelezi(x)} title="Nastavi zadnji pregled na danes">✓ Pregledano danes</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {nov && <NapravaObrazec onClose={() => setNov(false)} />}
    </div>
  );
}

function NapravaObrazec({ onClose }) {
  const { objekti, toast, osvezi } = useData();
  const [f, setF] = useState({ objekt_id: '', tip: '', proizvajalec: '', model: '', leto: '', moc_kw: '', lokacija: '', zadnji_pregled: '', interval_mesecev: 12 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const shrani = async (e) => {
    e.preventDefault();
    const z = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]));
    const { error } = await sb.from('naprave').insert(z);
    if (error) return toast('Napaka: ' + error.message, true);
    toast('Naprava dodana'); osvezi(); onClose();
  };
  return (
    <Modal naslov="Nova naprava" onClose={onClose}>
      <form className="obrazec" onSubmit={shrani}>
        <Polje label="Objekt *" siroko><select required value={f.objekt_id} onChange={set('objekt_id')}><option value="">— izberi —</option>{objekti.map((o) => <option key={o.id} value={o.id}>{o.naziv}</option>)}</select></Polje>
        <Polje label="Tip *" siroko><input required list="tipi" value={f.tip} onChange={set('tip')} placeholder="npr. Plinski kondenzacijski kotel" />
          <datalist id="tipi">{['Plinski kondenzacijski kotel', 'Plinski kotel', 'Oljni kotel', 'Kotel na pelete', 'Toplotna črpalka zrak-voda', 'Toplotna postaja (daljinsko ogrevanje)', 'Dvigalo', 'Klimatska naprava', 'Hidroforna postaja', 'Gasilni aparati'].map((t) => <option key={t} value={t} />)}</datalist></Polje>
        <Polje label="Proizvajalec"><input value={f.proizvajalec} onChange={set('proizvajalec')} /></Polje>
        <Polje label="Model"><input value={f.model} onChange={set('model')} /></Polje>
        <Polje label="Leto"><input type="number" value={f.leto} onChange={set('leto')} /></Polje>
        <Polje label="Moč (kW)"><input type="number" value={f.moc_kw} onChange={set('moc_kw')} /></Polje>
        <Polje label="Lokacija v objektu" siroko><input value={f.lokacija} onChange={set('lokacija')} placeholder="npr. kotlovnica, klet" /></Polje>
        <Polje label="Zadnji pregled"><input type="date" value={f.zadnji_pregled} onChange={set('zadnji_pregled')} /></Polje>
        <Polje label="Interval pregleda (mesecev)"><input type="number" value={f.interval_mesecev} onChange={set('interval_mesecev')} /></Polje>
        <div className="gumbi siroko"><button type="button" className="gumb" onClick={onClose}>Prekliči</button><button className="gumb primarni">Shrani</button></div>
      </form>
    </Modal>
  );
}

/* ---------- DOKUMENTI (mape) ---------- */
export function Dokumenti() {
  const { objekti, profili, me, toast } = useData();
  const [mapa, setMapa] = useState(null);
  const [objekt, setObjekt] = useState('');
  const [q, setQ] = useState('');
  const [vsi, setVsi] = useState([]);
  const [nalagam, setNalagam] = useState(false);
  const [ciljnaMapa, setCiljnaMapa] = useState('Drugo');
  const vhod = useRef();
  const nalozi = async () => { const { data } = await sb.from('dokumenti').select('*').order('created_at', { ascending: false }); setVsi(data || []); };
  useEffect(() => { nalozi(); }, []);

  const filt = vsi.filter((d) => (!mapa || d.mapa === mapa) && (!objekt || String(d.objekt_id) === objekt) && d.ime.toLowerCase().includes(q.toLowerCase()));
  const upload = async (files) => {
    setNalagam(true);
    const m = mapa || ciljnaMapa;
    for (const file of files) {
      const pot = `${varnoIme(m)}/${objekt || 'splosno'}/${Date.now()}_${varnoIme(file.name)}`;
      const up = await sb.storage.from('dokumenti').upload(pot, file, { contentType: file.type });
      if (up.error) { toast('Napaka: ' + up.error.message, true); continue; }
      await sb.from('dokumenti').insert({ ime: file.name, pot, mapa: m, velikost: file.size, mime: file.type, objekt_id: objekt || null, nalozil_id: me.id });
    }
    setNalagam(false); toast('Naloženo'); nalozi();
  };
  const izbrisi = async (d) => {
    if (!confirm(`Izbrišem »${d.ime}«?`)) return;
    await sb.storage.from('dokumenti').remove([d.pot]);
    const { error } = await sb.from('dokumenti').delete().eq('id', d.id);
    if (error) toast('Napaka: ' + error.message, true); else { toast('Izbrisano'); nalozi(); }
  };

  return (
    <div className="stran"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); }}>
      <div className="stran-glava">
        <div><h1>Dokumenti</h1><p className="podnaslov">Skupna mapa podjetja – pogodbe, zapisniki, fotografije, ponudbe. Datoteke lahko tudi povlečeš sem.</p></div>
        <div className="glava-desno">
          {!mapa && <select value={ciljnaMapa} onChange={(e) => setCiljnaMapa(e.target.value)} title="V katero mapo naložim">{MAPE.map((m) => <option key={m}>{m}</option>)}</select>}
          <button className="gumb primarni" onClick={() => vhod.current.click()} disabled={nalagam}>{nalagam ? 'Nalagam …' : '⬆ Naloži datoteke'}</button>
          <input ref={vhod} type="file" multiple hidden onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
        </div>
      </div>
      <div className="mape">
        <button className={'mapa' + (!mapa ? ' on' : '')} onClick={() => setMapa(null)}><span>🗄️</span>Vse<small>{vsi.length}</small></button>
        {MAPE.map((m) => (
          <button key={m} className={'mapa' + (mapa === m ? ' on' : '')} onClick={() => setMapa(m)}>
            <span>{MAPA_IKONA[m]}</span>{m}<small>{vsi.filter((d) => d.mapa === m).length}</small>
          </button>
        ))}
      </div>
      <div className="filtri">
        <input className="iskanje" placeholder="🔍 Išči datoteko …" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={objekt} onChange={(e) => setObjekt(e.target.value)}><option value="">Vsi objekti</option>{objekti.map((o) => <option key={o.id} value={o.id}>{o.naziv}</option>)}</select>
      </div>
      <div className="kartica brez-roba">
        {filt.length ? (
          <table className="tabela">
            <thead><tr><th>Ime</th><th>Mapa</th><th>Objekt</th><th>Naložil</th><th>Velikost</th><th /></tr></thead>
            <tbody>
              {filt.map((d) => {
                const o = objekti.find((x) => x.id === d.objekt_id); const p = profili.find((x) => x.id === d.nalozil_id);
                return (
                  <tr key={d.id} onClick={() => odpriDatoteko(d)}>
                    <td><b>{d.mime?.startsWith('image/') ? '🖼️' : d.mime === 'application/pdf' ? '📕' : '📄'} {d.ime}</b>{d.naloga_id && <div className="pod">nalog #{d.naloga_id}</div>}</td>
                    <td>{MAPA_IKONA[d.mapa]} {d.mapa}</td>
                    <td>{o?.naziv || <span className="sivo">splošno</span>}</td>
                    <td>{p?.ime.split(' ')[0]}<div className="pod">{fRelativno(d.created_at)}</div></td>
                    <td>{fVelikost(d.velikost)}</td>
                    <td className="desno">{(me.vloga !== 'teren' || d.nalozil_id === me.id) && <button className="ikona-gumb" onClick={(e) => { e.stopPropagation(); izbrisi(d); }} title="Izbriši">🗑</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Prazno ikona="📂">{vsi.length ? 'Ni datotek v tej mapi.' : 'Še ni dokumentov. Naloži prvo datoteko ali jo povleci sem.'}</Prazno>}
      </div>
    </div>
  );
}

/* ---------- EKIPA ---------- */
export function Ekipa() {
  const { profili, naloge, pojdi } = useData();
  const mesecZac = danes(); mesecZac.setDate(1);
  return (
    <div className="stran">
      <div className="stran-glava"><div><h1>Ekipa</h1><p className="podnaslov">{profili.length} zaposlenih</p></div></div>
      <div className="ekipa-mreza">
        {profili.map((p) => {
          const akt = naloge.filter((n) => n.dodeljeno_id === p.id && AKTIVNI.includes(n.status)).length;
          const opr = naloge.filter((n) => n.dodeljeno_id === p.id && n.status === 'opravljena' && new Date(n.opravljeno_at) >= mesecZac);
          const min = opr.reduce((s, n) => s + (n.porabljen_cas_min || 0), 0);
          return (
            <div key={p.id} className="oseba-kartica" onClick={() => pojdi('naloge', { dodeljeno: p.id })}>
              <Avatar p={p} size={52} />
              <b>{p.ime}</b><small>{p.delovno_mesto}</small>
              <span className={'vloga v-' + p.vloga}>{p.vloga === 'teren' ? 'Teren' : p.vloga === 'vodja' ? 'Vodja' : 'Pisarna'}</span>
              {p.telefon && <a href={'tel:' + p.telefon.replace(/\s/g, '')} onClick={(e) => e.stopPropagation()}>📞 {p.telefon}</a>}
              <div className="oseba-stat"><div><b>{akt}</b><small>odprtih</small></div><div><b>{opr.length}</b><small>opravljenih ta mesec</small></div><div><b>{fMinute(min)}</b><small>evidentiranega dela</small></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
