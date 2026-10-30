import React, { createContext, useContext, useEffect } from 'react';
import { STATUSI, PRIORITETE, zacetnice, KAT_IKONA } from './lib.js';

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
  return <span className={'prio prio-' + p}>{p === 'nujno' ? '⚠ ' : ''}{x.l}</span>;
}

export function Kat({ k }) {
  return <span className="kat">{KAT_IKONA[k] || '•'} {k}</span>;
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
          <button className="ikona-gumb" onClick={onClose} aria-label="Zapri">✕</button>
        </div>
        <div className="modal-telo">{children}</div>
      </div>
    </div>
  );
}

export function Prazno({ ikona = '✓', children }) {
  return <div className="prazno"><div className="prazno-ikona">{ikona}</div><div>{children}</div></div>;
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
