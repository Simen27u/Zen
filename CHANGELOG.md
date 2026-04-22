# Changelog

## DEV 1.4 - Tekstpolering

- Strammet inn tekstsystemet med kortere, roligere formuleringer.
- Bygget tekstene mer modulært fra periode og værtype, med stabil daglig variasjon.
- Polerte faste skjermtekster i header, dagskort, footer og `Værtest`.

## DEV 1.3 - Nattstemning og bedre værtest

- Endret lyn fra fullskjerm-flash til tegnet lyn med sidegrener og svakere atmosfærisk glød.
- La til mørkere, mer stjernete nattstemning.
- Utvidet `Værtest` med valg for tid på døgnet.
- Ryddet dobbel værvisning ved å gjøre topp-pill til ikon og temperatur, mens områdekortet beholder detaljene.

## DEV 1.2 - Varierte tekster og bedre stedsnavn

- La til regelstyrte tekstvariasjoner basert på dagsperiode, værtype og dato.
- Gjorde tekstvalg stabile per dag, slik at Zen ikke hopper tilfeldig ved refresh.
- Forbedret backend sin reverse geocoding for stedsnavn ved å lese administrative nivåer fra Nominatim.

## DEV 1.1 - Produktlayout og værtest

- Raffinerte hovedlayouten med tydeligere produktfølelse.
- La til hilsen som `God morgen`, `God dag`, `God kveld` og `God natt`.
- Flyttet værvisning til en kompakt pill.
- La til dagskort, tidslinje og `Værtest` for å teste ulike værscener.
- La til første versjon av stedsnavnoppslag fra koordinater.

## DEV 1.0 - Første DEV-versjon

- Gjorde mockupen om til en lokal DEV-app.
- La til React/Vite-frontend og Express-backend.
- Koblet frontend til ekte værdata fra MET/Yr.
- Beholdt reservevær hvis backend eller værhenting feiler.
