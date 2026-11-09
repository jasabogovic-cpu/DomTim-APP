# Edge funkcije (Supabase)

- `poslji-obvestilo` – obvestila na telefon (web push). Kliče jo sprožilec v bazi.
- `poslji-nalog` – pošlje PDF delovnega naloga stranki z info@domtim.si (SMTP mail.domtim.si:465). Geslo je skrivnost `SMTP_GESLO` v Supabase → Edge Functions → Secrets.
- `preveri-smtp` – preveri, ali je geslo nastavljeno in ga strežnik sprejme (ne pošlje ničesar).

Pred spremembo funkcije vedno izhajaj iz kode v tej mapi in jo po objavi posodobi tudi tukaj.
