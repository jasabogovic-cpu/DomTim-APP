import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Check, Eraser, PenLine, UserX, Clock, Package, HardHat } from 'lucide-react';
import { sb, isoDan, fDatum, fCas, fMinute } from './lib.js';
import { useData, Modal, Polje, Avatar } from './ui.jsx';

/* ---------- pomožno ---------- */
export const fEur = (x) => (x == null || isNaN(x) ? '–' : Number(x).toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const st = (x) => (x === '' || x == null ? null : Number(String(x).replace(',', '.')));
const ura = (d) => d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit', hour12: false });
export const ureMed = (od, d) => {
  if (!od || !d) return null;
  const [a, b] = od.split(':').map(Number); const [c, e] = d.split(':').map(Number);
  let m = c * 60 + e - (a * 60 + b); if (m < 0) m += 24 * 60;
  return Math.round((m / 60) * 4) / 4; // na četrt ure
};
export const DDV_STOPNJE = [22, 9.5, 0];

/** Seštevki po obrazcu: delo, material, osnove in DDV po stopnjah, skupaj. */
export function izracun(delo, material, privzetDdv = 22) {
  const vr = (x) => (x == null || isNaN(x) ? 0 : x);
  let sDelo = 0, sMat = 0; const osnove = { 22: 0, 9.5: 0, 0: 0 }; let manjkaCena = false;
  for (const d of delo) {
    const v = vr(d.ure) * vr(d.cena); sDelo += v; osnove[d.ddv ?? privzetDdv] += v;
    if (d.cena == null && d.ure) manjkaCena = true;
  }
  for (const m of material) {
    const v = vr(m.kolicina) * vr(m.cena); sMat += v; osnove[m.ddv ?? privzetDdv] += v;
    if (m.cena == null) manjkaCena = true;
  }
  const ddv = { 22: osnove[22] * 0.22, 9.5: osnove[9.5] * 0.095, 0: 0 };
  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    delo: r2(sDelo), material: r2(sMat), osnova: r2(sDelo + sMat), ure: delo.reduce((s, d) => s + vr(d.ure), 0),
    osnove: { 22: r2(osnove[22]), 9.5: r2(osnove[9.5]), 0: r2(osnove[0]) }, ddv: { 22: r2(ddv[22]), 9.5: r2(ddv[9.5]) },
    skupaj: r2(sDelo + sMat + ddv[22] + ddv[9.5]), manjkaCena,
  };
}

/** Naloži postavke naloga in jih osvežuje ob spremembah. */
export function usePostavke(nalogaId) {
  const { verzija } = useData();
  const [p, setP] = useState({ delo: [], material: [], nalozeno: false });
  const nalozi = async () => {
    const [d, m] = await Promise.all([
      sb.from('naloga_delo').select('*').eq('naloga_id', nalogaId).order('datum').order('id'),
      sb.from('naloga_material').select('*').eq('naloga_id', nalogaId).order('id'),
    ]);
    setP({ delo: d.data || [], material: m.data || [], nalozeno: true });
  };
  useEffect(() => { nalozi(); }, [nalogaId, verzija]);
  return [p, nalozi];
}

export function useCenik() {
  const [c, setC] = useState([]);
  useEffect(() => { sb.from('cenik').select('*').eq('aktiven', true).order('tip').order('naziv').then(({ data }) => setC(data || [])); }, []);
  return c;
}

/* ---------- Podpis s prstom ---------- */
export function PodpisPlatno({ onSpremeni }) {
  const ref = useRef(); const risem = useRef(false); const zadnja = useRef(null); const [prazno, setPrazno] = useState(true);
  useEffect(() => {
    const c = ref.current; const dpr = window.devicePixelRatio || 1;
    const nastavi = () => { const r = c.getBoundingClientRect(); c.width = r.width * dpr; c.height = r.height * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr); x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0d2c54'; };
    nastavi();
  }, []);
  const tocka = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const dol = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); risem.current = true; zadnja.current = tocka(e); };
  const premik = (e) => {
    if (!risem.current) return; e.preventDefault();
    const x = ref.current.getContext('2d'); const [a, b] = zadnja.current; const [c, d] = tocka(e);
    x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); zadnja.current = [c, d];
    if (prazno) { setPrazno(false); }
  };
  const gor = () => { if (risem.current) { risem.current = false; onSpremeni(prazno ? null : ref.current); } };
  useEffect(() => { if (!prazno) onSpremeni(ref.current); }, [prazno]);
  const pobrisi = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setPrazno(true); onSpremeni(null); };
  return (
    <div className="podpis-ovoj">
      <canvas ref={ref} className="podpis-platno" onPointerDown={dol} onPointerMove={premik} onPointerUp={gor} onPointerLeave={gor} />
      {prazno && <span className="podpis-namig"><PenLine size={16} /> Podpis s prstom</span>}
      {!prazno && <button type="button" className="gumb mali podpis-brisi" onClick={pobrisi}><Eraser size={14} /> Pobriši</button>}
    </div>
  );
}

async function shraniPodpis(platno, nalogaId) {
  // obreži na podpis + belo ozadje
  const blob = await new Promise((r) => platno.toBlob(r, 'image/png'));
  const pot = `podpisi/${nalogaId}_${Date.now()}.png`;
  const { error } = await sb.storage.from('dokumenti').upload(pot, blob, { contentType: 'image/png' });
  if (error) throw error;
  return pot;
}

/* ---------- Zaključek naloga (teren) ---------- */
export function ZakljuciObrazec({ n, onClose }) {
  const { me, profili, toast, osvezi } = useData();
  const cenik = useCenik();
  const [post, , ] = usePostavke(n.id);
  const pisarna = me.vloga !== 'teren';
  const zdaj = new Date();
  const [porocilo, setPorocilo] = useState(n.porocilo || '');
  const [delo, setDelo] = useState(null);
  const [mat, setMat] = useState(null);
  const [zaRacun, setZaRacun] = useState(n.za_racun);
  const [podpis, setPodpis] = useState(null);
  const [podpisIme, setPodpisIme] = useState(n.prijavitelj || '');
  const [niPrisoten, setNiPrisoten] = useState(false);
  const [shranjujem, setShranjujem] = useState(false);

  // začetne vrstice: obstoječe postavke ali predlog iz časa dela
  useEffect(() => {
    if (!post.nalozeno || delo) return;
    if (post.delo.length) setDelo(post.delo.map((d) => ({ ...d, od: d.od?.slice(0, 5) || '', do: d.do?.slice(0, 5) || '' })));
    else {
      const zac = n.zacetek_at && isoDan(n.zacetek_at) === isoDan(zdaj) ? ura(new Date(n.zacetek_at)) : '';
      const kon = ura(zdaj);
      setDelo([{ datum: isoDan(zdaj), izvajalec_id: n.dodeljeno_id || me.id, od: zac, do: kon, ure: zac ? ureMed(zac, kon) : '' }]);
    }
    setMat(post.material.length ? post.material.map((m) => ({ ...m })) : []);
  }, [post.nalozeno]);

  const privzetaCenaDela = () => cenik.find((c) => c.tip === 'delo' && c.enota === 'ura')?.cena ?? null;
  const posodobiDelo = (i, k, v) => setDelo((x) => x.map((d, j) => {
    if (j !== i) return d; const nd = { ...d, [k]: v };
    if ((k === 'od' || k === 'do') && nd.od && nd.do) nd.ure = ureMed(nd.od, nd.do);
    return nd;
  }));
  const posodobiMat = (i, k, v) => setMat((x) => x.map((m, j) => {
    if (j !== i) return m; const nm = { ...m, [k]: v };
    if (k === 'naziv') { const c = cenik.find((c) => c.tip === 'material' && c.naziv.toLowerCase() === v.toLowerCase()); if (c) { nm.cenik_id = c.id; nm.enota = c.enota; if (nm.cena == null || !pisarna) nm.cena = c.cena; nm.ddv = c.ddv; } else { nm.cenik_id = null; } }
    return nm;
  }));

  const shrani = async (e) => {
    e.preventDefault();
    if (!porocilo.trim()) return toast('Napiši, kaj je bilo narejeno.', true);
    if (!niPrisoten && !podpis && !pisarna) return toast('Stranka naj se podpiše ali označi »Stranka ni prisotna«.', true);
    setShranjujem(true);
    try {
      // postavke: zamenjamo vse vrstice tega naloga
      const dVrst = delo.filter((d) => st(d.ure)).map((d) => ({
        naloga_id: n.id, datum: d.datum || isoDan(zdaj), izvajalec_id: d.izvajalec_id || null, od: d.od || null, do: d.do || null,
        ure: st(d.ure), cena: d.cena ?? privzetaCenaDela(), ddv: d.ddv ?? n.ddv,
      }));
      const mVrst = mat.filter((m) => m.naziv?.trim()).map((m) => ({
        naloga_id: n.id, cenik_id: m.cenik_id || null, naziv: m.naziv.trim(), enota: m.enota || 'kos', kolicina: st(m.kolicina) ?? 1, cena: m.cena ?? null, ddv: m.ddv ?? n.ddv,
      }));
      let r = await sb.from('naloga_delo').delete().eq('naloga_id', n.id); if (r.error) throw r.error;
      r = await sb.from('naloga_material').delete().eq('naloga_id', n.id); if (r.error) throw r.error;
      if (dVrst.length) { r = await sb.from('naloga_delo').insert(dVrst); if (r.error) throw r.error; }
      if (mVrst.length) { r = await sb.from('naloga_material').insert(mVrst); if (r.error) throw r.error; }

      const upd = {
        status: 'opravljena', porocilo, za_racun: zaRacun,
        porabljen_cas_min: Math.round(dVrst.reduce((s, d) => s + d.ure, 0) * 60) || null,
        material: mVrst.map((m) => `${m.kolicina} ${m.enota} ${m.naziv}`).join(', ') || null,
      };
      if (podpis) {
        upd.podpis_pot = await shraniPodpis(podpis, n.id);
        upd.podpis_ime = podpisIme || null; upd.podpis_at = new Date().toISOString(); upd.podpis_status = 'podpisano';
      } else if (niPrisoten) { upd.podpis_status = 'ni_prisoten'; upd.podpis_at = new Date().toISOString(); }
      r = await sb.from('naloge').update(upd).eq('id', n.id); if (r.error) throw r.error;
      toast(`Nalog #${n.id} zaključen`); osvezi(); onClose();
    } catch (err) { toast('Napaka: ' + err.message, true); }
    setShranjujem(false);
  };

  if (!delo || !mat) return <Modal naslov={`Zaključi nalog #${n.id}`} onClose={onClose}><p className="sivo">Nalagam …</p></Modal>;
  const materialCenik = cenik.filter((c) => c.tip === 'material');

  return (
    <Modal naslov={`Zaključi nalog #${n.id}`} onClose={onClose} siroko>
      <form onSubmit={shrani} className="zakljuci">
        <section>
          <h4>Opis izvedbe del *</h4>
          <textarea rows={3} required value={porocilo} onChange={(e) => setPorocilo(e.target.value)} placeholder="Kaj je bilo narejeno, ugotovitve, priporočila …" />
        </section>

        <section>
          <h4><Clock size={14} className="ik" /> I. Delo</h4>
          {delo.map((d, i) => (
            <div key={i} className="vrstica-delo">
              <select value={d.izvajalec_id || ''} onChange={(e) => posodobiDelo(i, 'izvajalec_id', e.target.value)} aria-label="Izvajalec">
                {profili.map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}
              </select>
              <input type="date" value={d.datum} onChange={(e) => posodobiDelo(i, 'datum', e.target.value)} aria-label="Datum" />
              <div className="od-do">
                <input type="time" value={d.od || ''} onChange={(e) => posodobiDelo(i, 'od', e.target.value)} aria-label="Od" />
                <span>–</span>
                <input type="time" value={d.do || ''} onChange={(e) => posodobiDelo(i, 'do', e.target.value)} aria-label="Do" />
              </div>
              <label className="ure"><input type="number" step="0.25" min="0" value={d.ure ?? ''} onChange={(e) => posodobiDelo(i, 'ure', e.target.value)} aria-label="Ure" /> h</label>
              {delo.length > 1 && <button type="button" className="ikona-gumb" onClick={() => setDelo(delo.filter((_, j) => j !== i))} aria-label="Odstrani"><Trash2 size={16} /></button>}
            </div>
          ))}
          <button type="button" className="gumb mali" onClick={() => setDelo([...delo, { datum: isoDan(zdaj), izvajalec_id: me.id, od: '', do: '', ure: '' }])}><Plus size={14} /> Dodaj izvajalca / dan</button>
        </section>

        <section>
          <h4><Package size={14} className="ik" /> II. Material</h4>
          <datalist id="cenik-material">{materialCenik.map((c) => <option key={c.id} value={c.naziv} />)}</datalist>
          {mat.map((m, i) => (
            <div key={i} className="vrstica-mat">
              <input list="cenik-material" value={m.naziv || ''} onChange={(e) => posodobiMat(i, 'naziv', e.target.value)} placeholder="Naziv materiala (začni tipkati)" aria-label="Material" />
              <input type="number" step="0.01" min="0" value={m.kolicina ?? ''} onChange={(e) => posodobiMat(i, 'kolicina', e.target.value)} aria-label="Količina" />
              <input value={m.enota || ''} onChange={(e) => posodobiMat(i, 'enota', e.target.value)} className="enota" aria-label="Enota" />
              <button type="button" className="ikona-gumb" onClick={() => setMat(mat.filter((_, j) => j !== i))} aria-label="Odstrani"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="gumb mali" onClick={() => setMat([...mat, { naziv: '', kolicina: 1, enota: 'kos' }])}><Plus size={14} /> Dodaj material</button>
          {!pisarna && <p className="namig">Cene doda računovodstvo, ti vpiši samo, kaj in koliko je bilo porabljeno.</p>}
        </section>

        <section>
          <h4><PenLine size={14} className="ik" /> Potrditev stranke</h4>
          {!niPrisoten && <>
            <PodpisPlatno onSpremeni={setPodpis} />
            <input value={podpisIme} onChange={(e) => setPodpisIme(e.target.value)} placeholder="Ime in priimek stranke" className="mt-s" />
          </>}
          <label className="potrditev mt-s"><input type="checkbox" checked={niPrisoten} onChange={(e) => { setNiPrisoten(e.target.checked); setPodpis(null); }} /> <UserX size={15} /> Stranka ni prisotna – brez podpisa</label>
        </section>

        <label className="potrditev"><input type="checkbox" checked={zaRacun} onChange={(e) => setZaRacun(e.target.checked)} /> Delo se zaračuna (gre v obračun)</label>
        <div className="gumbi"><button type="button" className="gumb" onClick={onClose}>Prekliči</button><button className="gumb uspeh" disabled={shranjujem}>{shranjujem ? 'Shranjujem …' : <><Check size={16} /> Zaključi nalog</>}</button></div>
      </form>
    </Modal>
  );
}

function Celica({ lahko, upd, tabela, v, polje, tip = 'text', sirina, disabled, poseben }) {
  return (
    <input key={v.id + ':' + (v[polje] ?? '')} className={'celica' + (poseben ? ' ' + poseben : '')} style={sirina ? { width: sirina } : undefined} type={tip} step={tip === 'number' ? '0.01' : undefined}
      defaultValue={v[polje] ?? ''} disabled={!lahko || disabled}
      onBlur={(e) => { const nv = tip === 'number' ? st(e.target.value) : (e.target.value || null); if (nv !== (v[polje] ?? null)) upd(tabela, v.id, polje, nv); }} />
  );
}
function DdvIzbira({ upd, pisarna, privzeto, tabela, v }) {
  return (
    <select className="celica" value={v.ddv ?? privzeto} disabled={!pisarna} onChange={(e) => upd(tabela, v.id, 'ddv', Number(e.target.value))}>
      {DDV_STOPNJE.map((x) => <option key={x} value={x}>{String(x).replace('.', ',')} %</option>)}
    </select>
  );
}

/* ---------- Delovni nalog v podrobnostih: glava, postavke, seštevki, podpis ---------- */
export function DelovniNalog({ n }) {
  const { me, profili, toast } = useData();
  const pisarna = me.vloga !== 'teren';
  const [post, nalozi] = usePostavke(n.id);
  const cenik = useCenik();
  const [glavaUredi, setGlavaUredi] = useState(false);
  const [podpisUrl, setPodpisUrl] = useState(null);
  const zaklenjeno = !!n.pregledano_at && !pisarna;
  const lahko = pisarna || (!zaklenjeno && (n.dodeljeno_id === me.id || !n.dodeljeno_id));
  const s = izracun(post.delo, post.material, n.ddv);

  useEffect(() => {
    if (!n.podpis_pot) return setPodpisUrl(null);
    sb.storage.from('dokumenti').createSignedUrl(n.podpis_pot, 3600).then(({ data }) => setPodpisUrl(data?.signedUrl));
  }, [n.podpis_pot]);

  const upd = async (tabela, id, polje, vrednost) => {
    const { error } = await sb.from(tabela).update({ [polje]: vrednost }).eq('id', id);
    if (error) toast('Napaka: ' + error.message, true); else nalozi();
  };
  const dodaj = async (tabela) => {
    const z = tabela === 'naloga_delo'
      ? { naloga_id: n.id, izvajalec_id: n.dodeljeno_id || me.id, ure: 1, cena: cenik.find((c) => c.tip === 'delo' && c.enota === 'ura')?.cena ?? null, ddv: n.ddv }
      : { naloga_id: n.id, naziv: 'Material', kolicina: 1, ddv: n.ddv };
    const { error } = await sb.from(tabela).insert(z); if (error) toast('Napaka: ' + error.message, true); else nalozi();
  };
  const odstrani = async (tabela, id) => { const { error } = await sb.from(tabela).delete().eq('id', id); if (error) toast('Napaka: ' + error.message, true); else nalozi(); };
  const izberiCenik = async (m, naziv) => {
    const c = cenik.find((c) => c.tip === 'material' && c.naziv === naziv);
    const z = c ? { naziv, cenik_id: c.id, enota: c.enota, cena: c.cena, ddv: c.ddv } : { naziv, cenik_id: null };
    const { error } = await sb.from('naloga_material').update(z).eq('id', m.id); if (error) toast('Napaka: ' + error.message, true); else nalozi();
  };

  const cp = { lahko, upd };
  return (
    <div className="delovni-nalog">
      <div className="dn-glava-vrsta">
        <h4>Delovni nalog</h4>
        {pisarna && <button className="gumb mali" onClick={() => setGlavaUredi(true)}>Uredi glavo</button>}
      </div>
      <dl className="dn-glava">
        <div><dt>Naročnik</dt><dd>{n.narocnik || <span className="sivo">–</span>}</dd></div>
        <div><dt>ID št.</dt><dd>{n.narocnik_id_st || <span className="sivo">–</span>}</dd></div>
        <div><dt>SM</dt><dd>{n.sm || <span className="sivo">–</span>}</dd></div>
        <div><dt>DDV</dt><dd>{String(n.ddv).replace('.', ',')} %</dd></div>
        <div><dt>Naročeno</dt><dd>{fDatum(n.created_at)}</dd></div>
        <div><dt>Začeto</dt><dd>{fDatum(n.zacetek_at)}</dd></div>
        <div><dt>Končano</dt><dd>{fDatum(n.opravljeno_at)}</dd></div>
        <div><dt>Kontaktna oseba</dt><dd>{n.kontaktna_oseba || <span className="sivo">–</span>}</dd></div>
      </dl>

      <div className="dn-tabela-ovoj">
        <table className="dn-tabela">
          <caption>I. Specifikacija dela</caption>
          <thead><tr><th>Datum</th><th>Izvajalec</th><th>Od</th><th>Do</th><th>Ure</th>{pisarna && <><th>Cena/h</th><th>DDV</th><th className="d">Vrednost</th></>}{lahko && <th />}</tr></thead>
          <tbody>
            {post.delo.map((d) => (
              <tr key={d.id}>
                <td><Celica {...cp} tabela="naloga_delo" v={d} polje="datum" tip="date" /></td>
                <td><select className="celica" value={d.izvajalec_id || ''} disabled={!lahko} onChange={(e) => upd('naloga_delo', d.id, 'izvajalec_id', e.target.value || null)}><option value="">—</option>{profili.map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}</select></td>
                <td><Celica {...cp} tabela="naloga_delo" v={{ ...d, od: d.od?.slice(0, 5) }} polje="od" tip="time" /></td>
                <td><Celica {...cp} tabela="naloga_delo" v={{ ...d, do: d.do?.slice(0, 5) }} polje="do" tip="time" /></td>
                <td><Celica {...cp} tabela="naloga_delo" v={d} polje="ure" tip="number" sirina={64} /></td>
                {pisarna && <>
                  <td><Celica {...cp} tabela="naloga_delo" v={d} polje="cena" tip="number" sirina={78} poseben={d.cena == null ? 'manjka' : ''} /></td>
                  <td><DdvIzbira upd={upd} pisarna={pisarna} privzeto={n.ddv} tabela="naloga_delo" v={d} /></td>
                  <td className="d">{fEur((d.ure || 0) * (d.cena || 0))}</td>
                </>}
                {lahko && <td><button className="ikona-gumb" onClick={() => odstrani('naloga_delo', d.id)} aria-label="Odstrani"><Trash2 size={15} /></button></td>}
              </tr>
            ))}
            {!post.delo.length && <tr><td colSpan={9} className="sivo prazna-vrstica">Ni vpisanega dela.</td></tr>}
          </tbody>
          {pisarna && <tfoot><tr><td colSpan={4}>Skupaj vrednost opravljenega dela (brez DDV)</td><td>{s.ure} h</td><td colSpan={2} /><td className="d">{fEur(s.delo)}</td>{lahko && <td />}</tr></tfoot>}
        </table>
        {lahko && <button className="gumb mali" onClick={() => dodaj('naloga_delo')}><Plus size={14} /> Vrstica dela</button>}
      </div>

      <div className="dn-tabela-ovoj">
        <table className="dn-tabela">
          <caption>II. Specifikacija materiala</caption>
          <thead><tr><th>Naziv materiala</th><th>Količina</th><th>Enota</th>{pisarna && <><th>Cena/enoto</th><th>DDV</th><th className="d">Vrednost</th></>}{lahko && <th />}</tr></thead>
          <tbody>
            {post.material.map((m) => (
              <tr key={m.id}>
                <td>{lahko
                  ? <input className="celica siroka" list="cenik-material-dn" defaultValue={m.naziv} onBlur={(e) => e.target.value !== m.naziv && izberiCenik(m, e.target.value)} />
                  : m.naziv}</td>
                <td><Celica {...cp} tabela="naloga_material" v={m} polje="kolicina" tip="number" sirina={70} /></td>
                <td><Celica {...cp} tabela="naloga_material" v={m} polje="enota" sirina={64} /></td>
                {pisarna && <>
                  <td><Celica {...cp} tabela="naloga_material" v={m} polje="cena" tip="number" sirina={78} poseben={m.cena == null ? 'manjka' : ''} /></td>
                  <td><DdvIzbira upd={upd} pisarna={pisarna} privzeto={n.ddv} tabela="naloga_material" v={m} /></td>
                  <td className="d">{fEur((m.kolicina || 0) * (m.cena || 0))}</td>
                </>}
                {lahko && <td><button className="ikona-gumb" onClick={() => odstrani('naloga_material', m.id)} aria-label="Odstrani"><Trash2 size={15} /></button></td>}
              </tr>
            ))}
            {!post.material.length && <tr><td colSpan={7} className="sivo prazna-vrstica">Ni porabljenega materiala.</td></tr>}
          </tbody>
          {pisarna && <tfoot><tr><td colSpan={5}>Skupaj vrednost materiala (brez DDV)</td><td className="d">{fEur(s.material)}</td>{lahko && <td />}</tr></tfoot>}
        </table>
        <datalist id="cenik-material-dn">{cenik.filter((c) => c.tip === 'material').map((c) => <option key={c.id} value={c.naziv} />)}</datalist>
        {lahko && <button className="gumb mali" onClick={() => dodaj('naloga_material')}><Plus size={14} /> Vrstica materiala</button>}
      </div>

      {pisarna && (
        <div className="dn-sestevek">
          {s.manjkaCena && <p className="opozorilo">Nekaterim postavkam manjka cena (označene rdeče).</p>}
          <table>
            <tbody>
              <tr><th>Skupaj vrednost storitve (I. + II.) – osnova brez DDV</th><td>{fEur(s.osnova)}</td></tr>
              {s.osnove[9.5] > 0 && <tr><th>Osnova 9,5 % · DDV 9,5 %</th><td>{fEur(s.osnove[9.5])} · {fEur(s.ddv[9.5])}</td></tr>}
              {s.osnove[22] > 0 && <tr><th>Osnova 22 % · DDV 22 %</th><td>{fEur(s.osnove[22])} · {fEur(s.ddv[22])}</td></tr>}
              {s.osnove[0] > 0 && <tr><th>Brez DDV</th><td>{fEur(s.osnove[0])}</td></tr>}
              <tr className="skupaj"><th>SKUPAJ (osnova + DDV)</th><td>{fEur(s.skupaj)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="dn-primopredaja">
        <h4>Primopredaja del</h4>
        {n.podpis_status === 'podpisano' ? (
          <div className="podpis-prikaz">
            {podpisUrl ? <img src={podpisUrl} alt="Podpis stranke" /> : <span className="sivo">Nalagam podpis …</span>}
            <div><b>{n.podpis_ime || 'Stranka'}</b><small>podpisano {fCas(n.podpis_at)}</small></div>
          </div>
        ) : n.podpis_status === 'ni_prisoten' ? (
          <p className="sivo"><UserX size={14} className="ik" /> Stranka ni bila prisotna – nalog ni podpisan.</p>
        ) : <p className="sivo">Še ni potrjeno s strani stranke.</p>}
      </div>
      {glavaUredi && <GlavaObrazec n={n} onClose={() => setGlavaUredi(false)} />}
    </div>
  );
}

function GlavaObrazec({ n, onClose }) {
  const { toast, osvezi } = useData();
  const [f, setF] = useState({ narocnik: n.narocnik || '', narocnik_id_st: n.narocnik_id_st || '', sm: n.sm || '', kontaktna_oseba: n.kontaktna_oseba || '', ddv: n.ddv });
  const [vseVrstice, setVse] = useState(true);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const shrani = async (e) => {
    e.preventDefault();
    const z = { ...f, ddv: Number(f.ddv) };
    for (const k of ['narocnik', 'narocnik_id_st', 'sm', 'kontaktna_oseba']) if (!z[k]) z[k] = null;
    const { error } = await sb.from('naloge').update(z).eq('id', n.id);
    if (error) return toast('Napaka: ' + error.message, true);
    if (vseVrstice && Number(f.ddv) !== Number(n.ddv)) {
      await sb.from('naloga_delo').update({ ddv: Number(f.ddv) }).eq('naloga_id', n.id);
      await sb.from('naloga_material').update({ ddv: Number(f.ddv) }).eq('naloga_id', n.id);
    }
    toast('Shranjeno'); osvezi(); onClose();
  };
  return (
    <Modal naslov="Glava delovnega naloga" onClose={onClose}>
      <form className="obrazec" onSubmit={shrani}>
        <Polje label="Naročnik" siroko><input value={f.narocnik} onChange={set('narocnik')} placeholder="npr. Etažni lastniki CPB 12" /></Polje>
        <Polje label="ID št. (davčna)"><input value={f.narocnik_id_st} onChange={set('narocnik_id_st')} /></Polje>
        <Polje label="SM (stroškovno mesto)"><input value={f.sm} onChange={set('sm')} /></Polje>
        <Polje label="Kontaktna oseba"><input value={f.kontaktna_oseba} onChange={set('kontaktna_oseba')} /></Polje>
        <Polje label="DDV">
          <select value={f.ddv} onChange={set('ddv')}>{DDV_STOPNJE.map((x) => <option key={x} value={x}>{String(x).replace('.', ',')} %</option>)}</select>
        </Polje>
        {Number(f.ddv) !== Number(n.ddv) && <label className="potrditev siroko"><input type="checkbox" checked={vseVrstice} onChange={(e) => setVse(e.target.checked)} /> Spremeni DDV tudi na vseh postavkah</label>}
        <div className="gumbi siroko"><button type="button" className="gumb" onClick={onClose}>Prekliči</button><button className="gumb primarni">Shrani</button></div>
      </form>
    </Modal>
  );
}

/* ---------- Cenik (pisarna) ---------- */
export function CenikUrejevalnik() {
  const { toast } = useData();
  const [c, setC] = useState([]);
  const [tip, setTip] = useState('material');
  const nalozi = () => sb.from('cenik').select('*').order('naziv').then(({ data }) => setC(data || []));
  useEffect(() => { nalozi(); }, []);
  const upd = async (id, polje, v) => { const { error } = await sb.from('cenik').update({ [polje]: v }).eq('id', id); if (error) toast('Napaka: ' + error.message, true); else nalozi(); };
  const dodaj = async () => { const { error } = await sb.from('cenik').insert({ tip, naziv: tip === 'delo' ? 'Nova storitev' : 'Nov material', enota: tip === 'delo' ? 'ura' : 'kos', cena: 0 }); if (error) toast('Napaka: ' + error.message, true); else nalozi(); };
  const v = c.filter((x) => x.tip === tip);
  return (
    <div>
      <div className="cenik-vrh">
        <div className="segment"><button className={tip === 'material' ? 'on' : ''} onClick={() => setTip('material')}><Package size={15} className="ik" /> Material</button><button className={tip === 'delo' ? 'on' : ''} onClick={() => setTip('delo')}><HardHat size={15} className="ik" /> Delo / storitve</button></div>
        <button className="gumb primarni" onClick={dodaj}><Plus size={16} /> Dodaj</button>
      </div>
      <p className="namig">Cene se ob vnosu postavke predlagajo same. Vzorčne cene so samo primer – vpišite svoje.</p>
      <div className="kartica brez-roba">
        <table className="tabela brez-klika-t">
          <thead><tr><th>Naziv</th><th>Enota</th><th>Cena (brez DDV)</th><th>DDV</th><th>Aktivno</th></tr></thead>
          <tbody>
            {v.map((x) => (
              <tr key={x.id} className={'brez-klika' + (x.aktiven ? '' : ' neaktivno')}>
                <td><input className="celica siroka" defaultValue={x.naziv} onBlur={(e) => e.target.value !== x.naziv && upd(x.id, 'naziv', e.target.value)} /></td>
                <td><input className="celica" style={{ width: 70 }} defaultValue={x.enota} onBlur={(e) => e.target.value !== x.enota && upd(x.id, 'enota', e.target.value)} /></td>
                <td><input className="celica" style={{ width: 90 }} type="number" step="0.01" defaultValue={x.cena} onBlur={(e) => st(e.target.value) !== Number(x.cena) && upd(x.id, 'cena', st(e.target.value) ?? 0)} /></td>
                <td><select className="celica" value={x.ddv} onChange={(e) => upd(x.id, 'ddv', Number(e.target.value))}>{DDV_STOPNJE.map((d) => <option key={d} value={d}>{String(d).replace('.', ',')} %</option>)}</select></td>
                <td><input type="checkbox" checked={x.aktiven} onChange={(e) => upd(x.id, 'aktiven', e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
