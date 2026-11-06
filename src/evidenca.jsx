import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Printer, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react';
import { sb, isoDan, danes, fDatum, fDatumKratko, dodeljeni, krajNaloga } from './lib.js';
import { useData, Avatar, Avatarji, Prazno, Kartica } from './ui.jsx';

const DNEVI = ['pon', 'tor', 'sre', 'čet', 'pet', 'sob', 'ned'];
const fUre = (x) => (x ? (Math.round(x * 100) / 100).toLocaleString('sl-SI') + ' h' : '–');
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function obdobje(vrsta, zamik) {
  const d = danes();
  if (vrsta === 'teden') {
    const od = new Date(d); od.setDate(d.getDate() - ((d.getDay() + 6) % 7) + zamik * 7);
    const doo = new Date(od); doo.setDate(od.getDate() + 6);
    return { od, do: doo, naslov: `${fDatum(od)} – ${fDatum(doo)}`, dnevi: [...Array(7)].map((_, i) => { const x = new Date(od); x.setDate(od.getDate() + i); return x; }) };
  }
  const od = new Date(d.getFullYear(), d.getMonth() + zamik, 1);
  const doo = new Date(d.getFullYear(), d.getMonth() + zamik + 1, 0);
  return { od, do: doo, naslov: od.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' }), dnevi: null };
}

function prenesiCsv(ime, glava, vrstice) {
  const q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + [glava.map(q).join(';'), ...vrstice.map((v) => v.map(q).join(';'))].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ime; a.click(); URL.revokeObjectURL(a.href);
}

function natisni(naslov, podnaslov, telo) {
  const w = window.open('', '_blank');
  if (!w) return alert('Brskalnik je blokiral novo okno. Dovoli pojavna okna za to stran.');
  w.document.write(`<!DOCTYPE html><html lang="sl"><head><meta charset="utf-8"><title>${esc(naslov)}</title><style>
    @page { size: A4 landscape; margin: 12mm; } body { font: 10pt/1.35 Arial, sans-serif; margin: 0; }
    h1 { font-size: 15pt; margin: 0; color: #0067b1; } .pod { color: #555; margin: 2px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; } th, td { border: 1px solid #999; padding: 3px 6px; text-align: left; vertical-align: top; }
    th { background: #eef2f6; font-size: 9pt; } .d { text-align: right; white-space: nowrap; } .sk td { font-weight: bold; background: #f4f6f8; }
    h2 { font-size: 11pt; margin: 14px 0 4px; } .mali { font-size: 8pt; color: #666; }
  </style></head><body><h1>${esc(naslov)}</h1><div class="pod">${esc(podnaslov)}</div>${telo}
  <p class="mali">Izpisano iz aplikacije DOMtim, ${new Date().toLocaleString('sl-SI')}</p>
  <script>setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
}

export function Evidenca() {
  const { me, profili, naloge, objekti, odpriNalogo, verzija } = useData();
  const pisarna = me.vloga !== 'teren';
  const [zavihek, setZavihek] = useState('ure');
  const [vrsta, setVrsta] = useState('teden');
  const [zamik, setZamik] = useState(0);
  const [delavec, setDelavec] = useState(pisarna ? '' : me.id);
  const [vrstice, setVrstice] = useState([]);
  const [odprt, setOdprt] = useState({});
  const [postavkeZakljucenih, setPostavkeZakljucenih] = useState([]);
  const o = obdobje(vrsta, zamik);
  const odIso = isoDan(o.od), doIso = isoDan(o.do);

  useEffect(() => {
    let q = sb.from('naloga_delo').select('*').gte('datum', odIso).lte('datum', doIso).order('datum').order('od');
    if (!pisarna) q = q.eq('izvajalec_id', me.id);
    q.then(({ data }) => setVrstice(data || []));
  }, [odIso, doIso, verzija]);

  const zakljuceni = useMemo(() => naloge.filter((n) => n.status === 'opravljena' && n.datum_izpolnitve >= odIso && n.datum_izpolnitve <= doIso
    && (pisarna ? (!delavec || dodeljeni(n).includes(delavec)) : dodeljeni(n).includes(me.id)))
    .sort((a, b) => (a.datum_izpolnitve || '').localeCompare(b.datum_izpolnitve || '') || a.id - b.id), [naloge, odIso, doIso, delavec]);
  const zIds = zakljuceni.map((n) => n.id).join(',');
  useEffect(() => {
    if (!zIds) return setPostavkeZakljucenih([]);
    sb.from('naloga_delo').select('naloga_id, ure, izvajalec_id').in('naloga_id', zIds.split(',').map(Number)).then(({ data }) => setPostavkeZakljucenih(data || []));
  }, [zIds, verzija]);

  const ljudje = (pisarna ? profili : profili.filter((p) => p.id === me.id))
    .filter((p) => !delavec || p.id === delavec)
    .map((p) => {
      const v = vrstice.filter((r) => r.izvajalec_id === p.id);
      return { p, v, skupaj: v.reduce((s, r) => s + Number(r.ure || 0), 0), poDnevih: o.dnevi ? o.dnevi.map((d) => v.filter((r) => r.datum === isoDan(d)).reduce((s, r) => s + Number(r.ure || 0), 0)) : null };
    })
    .filter((x) => x.v.length || x.p.vloga === 'teren' || x.p.id === delavec)
    .sort((a, b) => (a.p.vloga === 'teren' ? 0 : 1) - (b.p.vloga === 'teren' ? 0 : 1) || b.skupaj - a.skupaj);
  const vseUre = ljudje.reduce((s, x) => s + x.skupaj, 0);
  const naloga = (id) => naloge.find((n) => n.id === id);
  const ime = (id) => profili.find((p) => p.id === id)?.ime || '';

  const izvoziUre = () => prenesiCsv(`evidenca-ur-${odIso}_${doIso}.csv`, ['Delavec', 'Datum', 'Od', 'Do', 'Ure', 'Nalog', 'Naslov naloga', 'Objekt / stranka', 'Način'],
    ljudje.flatMap(({ p, v }) => v.map((r) => { const n = naloga(r.naloga_id); return [p.ime, fDatum(r.datum), r.od?.slice(0, 5) || '', r.do?.slice(0, 5) || '', String(r.ure).replace('.', ','), r.naloga_id, n?.naslov || '', n ? krajNaloga(n, objekti) || '' : '', n ? (n.za_racun ? 'zaračuna se' : 'po pogodbi') : '']; })));
  const natisniUre = () => {
    const glavaDni = o.dnevi ? o.dnevi.map((d, i) => `<th class="d">${DNEVI[i]} ${d.getDate()}. ${d.getMonth() + 1}.</th>`).join('') : '';
    const pov = `<table><tr><th>Delavec</th>${glavaDni}<th class="d">Skupaj</th></tr>${ljudje.map((x) => `<tr><td>${esc(x.p.ime)}</td>${x.poDnevih ? x.poDnevih.map((u) => `<td class="d">${u ? fUre(u) : ''}</td>`).join('') : ''}<td class="d"><b>${fUre(x.skupaj)}</b></td></tr>`).join('')}<tr class="sk"><td>Skupaj</td>${o.dnevi ? o.dnevi.map((d) => `<td class="d">${fUre(vrstice.filter((r) => r.datum === isoDan(d) && ljudje.some((x) => x.p.id === r.izvajalec_id)).reduce((s, r) => s + Number(r.ure || 0), 0))}</td>`).join('') : ''}<td class="d">${fUre(vseUre)}</td></tr></table>`;
    const pod = ljudje.filter((x) => x.v.length).map((x) => `<h2>${esc(x.p.ime)} – ${fUre(x.skupaj)}</h2><table><tr><th>Datum</th><th>Čas</th><th class="d">Ure</th><th>Nalog</th><th>Objekt / stranka</th></tr>${x.v.map((r) => { const n = naloga(r.naloga_id); return `<tr><td>${fDatum(r.datum)}</td><td>${r.od ? r.od.slice(0, 5) + '–' + (r.do || '').slice(0, 5) : ''}</td><td class="d">${fUre(Number(r.ure))}</td><td>#${r.naloga_id} ${esc(n?.naslov)}</td><td>${esc(n ? krajNaloga(n, objekti) : '')}</td></tr>`; }).join('')}</table>`).join('');
    natisni('Evidenca ur', `${vrsta === 'teden' ? 'Teden' : 'Mesec'}: ${o.naslov}${delavec ? ' · ' + ime(delavec) : ''}`, pov + pod);
  };

  const ureNaloga = (id) => postavkeZakljucenih.filter((r) => r.naloga_id === id).reduce((s, r) => s + Number(r.ure || 0), 0);
  const izvoziZakljucene = () => prenesiCsv(`zakljuceni-nalogi-${odIso}_${doIso}.csv`, ['Št.', 'Datum izpolnitve', 'Naslov', 'Objekt / stranka', 'Naročnik', 'Izvajalci', 'Ure', 'Način', 'Podpis stranke'],
    zakljuceni.map((n) => [n.id, fDatum(n.datum_izpolnitve), n.naslov, krajNaloga(n, objekti) || '', n.narocnik || '', dodeljeni(n).map(ime).join(', '), String(ureNaloga(n.id)).replace('.', ','), n.za_racun ? 'zaračuna se' : 'po pogodbi', n.podpis_status === 'podpisano' ? 'da' : n.podpis_status === 'ni_prisoten' ? 'stranka ni prisotna' : '']));
  const natisniZakljucene = () => natisni('Zaključeni delovni nalogi', `${vrsta === 'teden' ? 'Teden' : 'Mesec'}: ${o.naslov} · ${zakljuceni.length} nalogov${delavec ? ' · ' + ime(delavec) : ''}`,
    `<table><tr><th>Št.</th><th>Datum</th><th>Nalog</th><th>Objekt / stranka</th><th>Izvajalci</th><th class="d">Ure</th><th>Način</th><th>Opis izvedbe</th></tr>${zakljuceni.map((n) => `<tr><td>${n.id}</td><td>${fDatum(n.datum_izpolnitve)}</td><td>${esc(n.naslov)}</td><td>${esc(krajNaloga(n, objekti))}</td><td>${esc(dodeljeni(n).map(ime).join(', '))}</td><td class="d">${fUre(ureNaloga(n.id))}</td><td>${n.za_racun ? 'zaračuna se' : 'po pogodbi'}</td><td>${esc(n.porocilo)}</td></tr>`).join('')}
    <tr class="sk"><td colspan="5">Skupaj</td><td class="d">${fUre(zakljuceni.reduce((s, n) => s + ureNaloga(n.id), 0))}</td><td colspan="2">${zakljuceni.filter((n) => n.za_racun).length} za račun · ${zakljuceni.filter((n) => !n.za_racun).length} po pogodbi</td></tr></table>`);

  return (
    <div className="stran">
      <div className="stran-glava">
        <div><h1>Evidenca ur</h1><p className="podnaslov">{pisarna ? 'Ure vseh delavcev iz delovnih nalogov' : 'Tvoje ure in opravljeno delo'}</p></div>
        <div className="glava-desno">
          <button className="gumb" onClick={zavihek === 'ure' ? izvoziUre : izvoziZakljucene}><Download size={16} /> Excel</button>
          <button className="gumb" onClick={zavihek === 'ure' ? natisniUre : natisniZakljucene}><Printer size={16} /> PDF</button>
        </div>
      </div>

      <div className="evidenca-vrh">
        <div className="segment">
          <button className={vrsta === 'teden' ? 'on' : ''} onClick={() => { setVrsta('teden'); setZamik(0); }}>Teden</button>
          <button className={vrsta === 'mesec' ? 'on' : ''} onClick={() => { setVrsta('mesec'); setZamik(0); }}>Mesec</button>
        </div>
        <div className="obdobje">
          <button className="ikona-gumb" onClick={() => setZamik(zamik - 1)} aria-label="Prejšnje"><ChevronLeft size={20} /></button>
          <b>{o.naslov}</b>
          <button className="ikona-gumb" onClick={() => setZamik(zamik + 1)} aria-label="Naslednje"><ChevronRight size={20} /></button>
          {zamik !== 0 && <button className="gumb mali" onClick={() => setZamik(0)}>{vrsta === 'teden' ? 'Ta teden' : 'Ta mesec'}</button>}
        </div>
        {pisarna && (
          <select value={delavec} onChange={(e) => setDelavec(e.target.value)} className="delavec-izbor">
            <option value="">Vsi delavci</option>
            {profili.map((p) => <option key={p.id} value={p.id}>{p.ime}</option>)}
          </select>
        )}
      </div>

      <div className="zavihki">
        <button className={zavihek === 'ure' ? 'on' : ''} onClick={() => setZavihek('ure')}>Ure po delavcih<span>{fUre(vseUre)}</span></button>
        <button className={zavihek === 'zakljuceni' ? 'on' : ''} onClick={() => setZavihek('zakljuceni')}>Zaključeni nalogi<span>{zakljuceni.length}</span></button>
      </div>

      {zavihek === 'ure' ? (
        <div className="evidenca-ure">
          {ljudje.map(({ p, v, skupaj, poDnevih }) => (
            <Kartica key={p.id} className="delavec-ure">
              <div className="du-glava" onClick={() => setOdprt({ ...odprt, [p.id]: !odprt[p.id] })}>
                <Avatar p={p} size={34} />
                <div className="du-ime"><b>{p.ime}</b><small>{p.delovno_mesto}</small></div>
                <div className="du-skupaj"><b>{fUre(skupaj)}</b><small>{new Set(v.map((r) => r.naloga_id)).size} nalogov</small></div>
                {v.length > 0 && (odprt[p.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
              </div>
              {poDnevih && (
                <div className="du-dnevi">
                  {poDnevih.map((u, i) => (
                    <div key={i} className={(u ? 'ima' : '') + (isoDan(o.dnevi[i]) === isoDan(new Date()) ? ' danes' : '')}>
                      <small>{DNEVI[i]} {o.dnevi[i].getDate()}.</small><b>{u ? (Math.round(u * 100) / 100).toLocaleString('sl-SI') : '·'}</b>
                    </div>
                  ))}
                </div>
              )}
              {odprt[p.id] && v.length > 0 && (
                <table className="tabela du-podrobno">
                  <thead><tr><th>Datum</th><th>Čas</th><th>Ure</th><th>Nalog</th></tr></thead>
                  <tbody>
                    {v.map((r) => { const n = naloga(r.naloga_id); return (
                      <tr key={r.id} onClick={() => odpriNalogo(r.naloga_id)}>
                        <td>{fDatumKratko(r.datum)}</td>
                        <td>{r.od ? `${r.od.slice(0, 5)}–${(r.do || '').slice(0, 5)}` : '–'}</td>
                        <td>{fUre(Number(r.ure))}</td>
                        <td><span className="st-naloga">#{r.naloga_id}</span> {n?.naslov}<div className="pod">{n ? krajNaloga(n, objekti) : ''}</div></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              )}
            </Kartica>
          ))}
          {!ljudje.length && <Prazno ikona={Clock}>V tem obdobju ni vpisanih ur.</Prazno>}
          <p className="namig">Ure se seštevajo iz delovnih nalogov (I. Delo). Če kdo pozabi vpisati čas, ga popravite v nalogu.</p>
        </div>
      ) : (
        <div className="kartica brez-roba">
          {zakljuceni.length ? (
            <table className="tabela">
              <thead><tr><th>Datum</th><th>Nalog</th><th>Objekt / stranka</th><th>Izvajalci</th><th>Ure</th><th>Način</th></tr></thead>
              <tbody>
                {zakljuceni.map((n) => {
                  const dod = dodeljeni(n).map((id) => profili.find((p) => p.id === id)).filter(Boolean);
                  return (
                    <tr key={n.id} onClick={() => odpriNalogo(n.id)}>
                      <td>{fDatumKratko(n.datum_izpolnitve)}</td>
                      <td><span className="st-naloga">#{n.id}</span> <b>{n.naslov}</b><div className="pod porocilo-kratko">{n.porocilo}</div></td>
                      <td>{krajNaloga(n, objekti) || <span className="sivo">–</span>}</td>
                      <td>{dod.length ? <span className="oseba"><Avatarji ljudje={dod} size={22} /> {dod.map((x) => x.ime.split(' ')[0]).join(', ')}</span> : '–'}</td>
                      <td>{fUre(ureNaloga(n.id))}</td>
                      <td>{n.za_racun ? 'zaračuna se' : <span className="sivo">po pogodbi</span>}{n.podpis_status === 'podpisano' && <div className="pod zeleno"><Check size={12} className="ik" /> podpisano</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <Prazno ikona={Check}>V tem obdobju ni zaključenih nalogov.</Prazno>}
        </div>
      )}
    </div>
  );
}
