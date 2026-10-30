import React, { createContext, useContext, useEffect } from 'react';
import { STATUSI, PRIORITETE, zacetnice, KAT_IKONA, MAPA_IKONA } from './lib.js';
import { X, Check, AlertTriangle, Wrench, Folder } from 'lucide-react';

export const KatIk = ({ k, s = 14 }) => { const C = KAT_IKONA[k] || Wrench; return <C size={s} className="ik" />; };
export const MapaIk = ({ m, s = 16 }) => { const C = MAPA_IKONA[m] || Folder; return <C size={s} className="ik" />; };

export const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

export function Status({ s }) {
  const x = STATUSI[s] || { l: s, c: '#888' };
  return <span className="badge" style={{ '--c': x.c }}><i />{x.l}</span>;
}

export function Prio({ p, kratko }) {
  const x = PRIORITETE[p];
  if (!x) return null;
  if (kratko && (p === 'normalna' || p === 'nizka')) return null;
  return <span className={'prio prio-' + p}>{p === 'nujno' && <AlertTriangle size={11} className="ik" strokeWidth={2.5} />}{x.l}</span>;
}

export function Kat({ k }) {
  return <span className="kat"><KatIk k={k} /> {k}</span>;
}

export function Avatar({ p, size = 28 }) {
  if (!p) return <span className="avatar empty" style={{ width: size, height: size }} title="Nedodeljeno">?</span>;
  return (
    <span className="avatar" title={p.ime} style={{ width: size, height: size, background: p.barva, fontSize: size * 0.4 }}>
      {zacetnice(p.ime)}
    </span>
  );
}

export function Modal({ naslov, onClose, children, siroko }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="ozadje" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (siroko ? ' siroko' : '')}>
        <div className="modal-glava">
          <h2>{naslov}</h2>
          <button className="ikona-gumb" onClick={onClose} aria-label="Zapri"><X size={20} /></button>
        </div>
        <div className="modal-telo">{children}</div>
      </div>
    </div>
  );
}

export function Prazno({ ikona: Ik = Check, children }) {
  return <div className="prazno"><div className="prazno-ikona"><Ik size={26} strokeWidth={1.6} /></div><div>{children}</div></div>;
}

export function Polje({ label, children, siroko }) {
  return <label className={'polje' + (siroko ? ' siroko' : '')}><span>{label}</span>{children}</label>;
}

export function Kartica({ naslov, desno, children, className = '' }) {
  return (
    <section className={'kartica ' + className}>
      {(naslov || desno) && <div className="kartica-glava"><h3>{naslov}</h3>{desno}</div>}
      {children}
    </section>
  );
}
