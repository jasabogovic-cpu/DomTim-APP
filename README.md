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

## Preizkusni računi (geslo `Domtim2026!`)
| Vloga | E-naslov |
|---|---|
| Direktor | direktor@domtim.demo |
| Poslovodja | poslovodja@domtim.demo |
| Upravnik / upravnica | upravnik1@domtim.demo, upravnik2@domtim.demo |
| Računovodstvo | racunovodstvo@domtim.demo |
| Teren | teren1@domtim.demo (serviser), teren2@domtim.demo (vzdrževalec), teren3@domtim.demo (hišnik) |

Pred pravo uporabo zamenjaj gesla in računom dodaj prave e-naslove zaposlenih.
