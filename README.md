# DOMtim – interna aplikacija za delovne naloge

Prototip sistema za upravljanje terenskih storitev (FSM) za podjetje za upravljanje in vzdrževanje stavb in kurilnih naprav.

## Funkcije
- **Pregled** za vodstvo: nujne, zamujene in nedodeljene naloge, obremenitev terenske ekipe, prihajajoči pregledi naprav
- **Delovni nalogi** kot seznam ali tabla (povleci in spusti), filtri, iskanje, zgodovina sprememb, komentarji, priponke
- **Moje naloge** za teren (prilagojeno telefonu): navigacija, klic stranke, začni in zaključi s poročilom, porabljenim časom in materialom, fotografije
- **Tedenski plan** po delavcih
- **Objekti**: kontakti, naprave, odprte naloge, zgodovina del, dokumenti
- **Naprave in redni pregledi**: samodejni izračun naslednjega pregleda, nalog za pregled z enim klikom
- **Dokumenti**: skupna mapa z mapami (pogodbe, zapisniki, fotografije …)
- **Ekipa** s statistiko opravljenega dela
- Sprotno osveževanje (ko nekdo spremeni nalog, se drugim takoj posodobi)

## Tehnologija
- Frontend: React (`src/`), zgrajen z esbuild v `index.html`, `app.js`, `app.css` (objavljeno na GitHub Pages)
- Backend: Supabase (Postgres + prijava + Storage + Realtime). Varnost z RLS: pisarna ureja vse, teren svoje naloge.

## Razvoj
```
npm install
./build.sh .     # zgradi v koren repozitorija
```

## Računi
Preizkusni računi so bili 13. 11. 2026 izbrisani. Vsak zaposleni ima svoj račun (vloga `vodja` = vse pravice vključno z brisanjem, `teren` = vsi nalogi brez obračuna). Geslo si vsak zamenja sam v meniju »Spremeni geslo«.

## Nočna varnostna kopija

GitHub Actions (`.github/workflows/nocna-kopija.yml`) vsako noč ob 2:30 izvozi bazo (sheme `public`, `auth`, `storage`), jo šifrira z AES256 in shrani kot artifact za 30 dni. Datoteke iz Storage (slike, PDF-ji) niso vključene.

Potrebna skrivnosti (Settings → Secrets and variables → Actions):
- `SUPABASE_DB_URL` – Supabase → Connect → **Session pooler** (URI z geslom baze)
- `BACKUP_GESLO` – geslo za šifriranje; shrani ga varno, brez njega kopije ni mogoče odpreti

Obnova:
```
gpg -d domtim-LLLL-MM-DD.dump.gpg > kopija.dump
pg_restore --no-owner --clean --if-exists -d "<SUPABASE_DB_URL>" kopija.dump
```
