import React, { useState } from 'react';
import { sb } from './lib.js';
import { Modal, Polje } from './ui.jsx';

/* Menjava gesla prijavljenega uporabnika */
export function SpremeniGeslo({ onClose, toast }) {
  const [staro, setStaro] = useState('');
  const [novo, setNovo] = useState('');
  const [ponovi, setPonovi] = useState('');
  const [napaka, setNapaka] = useState('');
  const [shranjujem, setShranjujem] = useState(false);

  const shrani = async (e) => {
    e.preventDefault();
    setNapaka('');
    if (novo.length < 8) return setNapaka('Novo geslo naj ima vsaj 8 znakov.');
    if (novo !== ponovi) return setNapaka('Gesli se ne ujemata.');
    if (novo === staro) return setNapaka('Novo geslo mora biti drugačno od trenutnega.');
    setShranjujem(true);
    // najprej preverimo trenutno geslo, da ga ne more zamenjati kdo drug na odklenjenem telefonu
    const { data: { user } } = await sb.auth.getUser();
    const { error: e1 } = await sb.auth.signInWithPassword({ email: user.email, password: staro });
    if (e1) { setShranjujem(false); return setNapaka('Trenutno geslo ni pravilno.'); }
    const { error } = await sb.auth.updateUser({ password: novo });
    setShranjujem(false);
    if (error) return setNapaka(error.message.includes('weak') || error.message.includes('Password') ? 'Geslo je prešibko – uporabi daljše geslo s črkami in številkami.' : 'Napaka: ' + error.message);
    toast('Geslo je spremenjeno.');
    onClose();
  };

  return (
    <Modal naslov="Spremeni geslo" onClose={onClose}>
      <form className="obrazec ena" onSubmit={shrani}>
        <Polje label="Trenutno geslo"><input type="password" value={staro} onChange={(e) => setStaro(e.target.value)} autoComplete="current-password" required /></Polje>
        <Polje label="Novo geslo (vsaj 8 znakov)"><input type="password" value={novo} onChange={(e) => setNovo(e.target.value)} autoComplete="new-password" required /></Polje>
        <Polje label="Ponovi novo geslo"><input type="password" value={ponovi} onChange={(e) => setPonovi(e.target.value)} autoComplete="new-password" required /></Polje>
        {napaka && <div className="napaka">{napaka}</div>}
        <div className="gumbi">
          <button type="button" className="gumb" onClick={onClose}>Prekliči</button>
          <button className="gumb primarni" disabled={shranjujem}>{shranjujem ? 'Shranjujem …' : 'Shrani novo geslo'}</button>
        </div>
      </form>
    </Modal>
  );
}
