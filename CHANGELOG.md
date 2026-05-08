# Changelog

## DEV 1.28 - Architecture map export fix

- La til en egen HTML-eksportmodus for arkitekturkartet, slik at PNG-versjonen ikke avhenger av nettleserens SVG-preview.
- Genererte `docs/architecture-map.png` på nytt som et vanlig høyoppløselig bilde uten ødeleggende preview-kant.
- Beholdt SVG som hovedkilde og HTML som enklere zoom-/visningsflate.

## DEV 1.27 - Architecture map image

- La til `docs/architecture-map.svg` som høyoppløselig vektorbilde av arkitekturen.
- Koblet SVG-bildet inn øverst i arkitekturdokumentet, slik at kartet kan åpnes og zoomes bedre.
- La til `docs/architecture-map.html` som en mer robust nettleservisning hvis Markdown/SVG-previewen ikke viser bildet.
- La til `docs/architecture-map.png` som trygg bildeversjon for visninger som ikke liker SVG.

## DEV 1.26 - Gemini text layer and architecture map

- La til nedlastbart arkitektkart i `docs/architecture-map.md` og `docs/architecture-map.mmd`.
- La til `GET /api/status` for trygg DEV-status uten å eksponere API-nøkler.
- La til `POST /api/zen-text` som valgfritt Gemini-lag for korte `Nå`-tekster, med lokal tekst som fallback.
- La inn statusvisning i DEV-testpanelet for backend, vær, lokale forslag og KI-tekst.
- Strammet Zen-tekstene slik at de blir kortere, mer konkrete og mindre KI-/wellness-aktige.

## DEV 1.25 - Backend weather identity

- Rettet backend sin `User-Agent` mot MET/Yr og Nominatim, slik at produksjons-backenden ikke blir avvist som en generisk testklient.
- La inn mulighet for `ZEN_USER_AGENT` som miljøvariabel, slik at identiteten kan overstyres fra Render uten kodeendring senere.
- Verifiserte at Render igjen returnerer ekte værdata til GitHub Pages-previewen.

## DEV 1.24 - Compact local suggestions

- Flyttet lokale forslag inn som en rolig tekstlinje i `Nå`-glasspanelet i stedet for å utvide område- og værkortet.
- Beholdt lokale forslag som en eksperimentell opt-in-funksjon, med fallback når Gemini ikke er tilgjengelig.
- Pushet `dev-1.24` som siste kompakte preview før backend weather identity-fiksen.

## DEV 1.23 - Desktop scene canvas

- Gj??r desktopvisningen til en fast Zen-scene i en responsiv ramme, i stedet for en vanlig dokumentlayout.
- Skalerer hele desktop-komposisjonen etter faktisk skjermflate, slik at paneler, tekst og avstander holder seg samlet.
- Lar mobil fortsette med trygg, naturlig appflyt og safe-area-luft.

## DEV 1.22 - Remove broken zoom compensation

- Tok bort desktopfors??ket som motvirket nettleserzoom, fordi det kollapset scenen ved kraftig zoom-out.
- Gikk tilbake til den stabile scenestrukturen i stedet for ?? la UI-et sl??ss med browserens egen zoom.
- Beholder dette som l??ring: vi m?? l??se skjermtilpasning med scene-framing, ikke med tvungen zoom-motvekt.

## DEV 1.20 - Responsive scene framing

- Beholder dev-1.8-scenen, men lar hele komposisjonen holde seg samlet i stedet for å strekkes mellom topp og bunn.
- Fjerner det store mellomrommet som oppstår ved zoom-out ved å sentrere hele scenen som én blokk.
- Bruker safe-area-padding i topp og bunn, slik at moderne iPhone-skjermer får penere luft rundt scenen.

## DEV 1.19 - Restore dev-1.8 scene layout

- Gjeninnførte scenestrukturen fra dev-1.8 med sentrert toppsone, max-w-7xl og bunnseksjon som hviler nederst.
- Fjernet de nyere viewport-/clamp-/ekstra-brede sceneendringene som gjorde Zen for liten eller for stor ved zoom.
- Beholder dagens backend- og deploykobling mens selve UI-scenen går tilbake til et mer stabilt utgangspunkt.

## DEV 1.18 - Fluid desktop scaling

- Lot hovedscenen bruke mer av brede skjermer i stedet for å stoppe ved en fast maksbredde.
- Gjorde overskrift, klokke og glasspaneler mer flytende med viewport-baserte størrelser.
- Lar Zen vokse roligere når vinduet eller zoom-nivået gir mer plass.

## DEV 1.17 - Responsive viewport recovery

- Fjernet fast desktophøyde som klippet topp og bunn på lavere skjermflater.
- Lot Zen tilpasse seg tilgjengelig nettleserhøyde og scrolle naturlig når innholdet trenger det.
- Tonet ned stedsnavn til mer ærlige etiketter som "Nær ..." eller "Standardsted" når presisjonen er usikker.

## DEV 1.16 - Desktop vertical balance

- Løftet desktopvisningen litt opp ved å gi mer rolig luft under hovedinnholdet.
- Beholder fast desktophøyde uten lang tom scrolling.
- Lar mobiloppsettet være uendret etter viewport-fiksen.

## DEV 1.15 - Viewport fit polish

- Gjorde bakgrunn, stjerner og vær-effekter faste til skjermen, så de ikke stopper før scrollområdet.
- Strammet desktopvisningen til én skjermhøyde for å fjerne lang tom scrolling.
- Reduserte mobilens kunstige bunnluft slik at siden bare scroller når innholdet faktisk trenger plass.

## DEV 1.14 - Stable page flow

- Fjernet ekstra layout-wrapper som kunne gi to konkurrerende scroll-/høydeområder.
- Lar desktop og mobil bruke én stabil dokumentflyt, slik at siden ikke starter midt i innholdet.
- Nullstiller lagret scrollposisjon ved innlasting, så nettleseren ikke gjenåpner Zen halvveis ned på siden.

## DEV 1.13 - Mobile single-scroll flow

- Gjorde desktopens topp-/bunnsone-layout aktiv bare på store skjermer.
- Lar mobil bruke én naturlig dokumentflyt, slik at scrolling ikke føles delt i to soner.
## DEV 1.12 - Mobile browser spacing

- Lot Zen scrolle vertikalt på mobil i stedet for å klippe innhold når siden er høyere enn skjermen.
- La til ekstra bunnluft på mobil slik at nettleserens adressefelt ikke dekker dagskort og footer.
## DEV 1.11 - Mobile viewport polish

- La til mobil `theme-color` og `viewport-fit=cover` for roligere overgang mot telefonens toppfelt.
- Bruker `100svh` og safe-area-spacing slik at mobilnettlesere med adressefelt oppfører seg mer stabilt.
- Strammet mobilkort og dagskort, og skjulte DEV Værtest-knappen på små skjermer så den ikke dekker innhold.
## DEV 1.10 - Location fallback polish

- La til Vossevangen som kjent sted, slik at live-backend kan vise et bedre navn når reverse geocoding ikke svarer.
- Beholder ekte værdata fra koordinatene selv når stedsnavn må falle tilbake til lokal stedsliste.
## DEV 1.9 - Live backend connection

- Gjorde frontend klar til å bruke en ekstern vær-backend via `VITE_WEATHER_URL`.
- Koblet GitHub Pages-builden til Render-backenden.
- Beholder lokal utvikling mot `localhost:3001` når miljøvariabelen ikke er satt.
## DEV 1.8 - GitHub Pages deploy

- La til GitHub Actions-workflow for å bygge og publisere frontend til GitHub Pages.
- Satte Vite-base til `/Zen/` når appen bygges for GitHub Pages.
- Beholder lokal utvikling på vanlig `/`, slik at `start-dev.ps1` fortsatt fungerer lokalt.
## DEV 1.7 - Layout balance polish

- Balanserte øvre sone med hilsen, klokke, Nå-panel og område/vær-panel.
- Flyttet dagskort, tidslinje og små steg ned som en egen roligere bunnsone.
- Fjernet gjentatt headertekst slik at Nå-panelet eier stemningssetningen.
- Linjerte område og vær tydeligere i samme glasspanel.
- Lot bare aktiv dagsperiode vise tekst, mens passerte perioder fades og markeres som gjort.
## DEV 1.6 - UI hierarchy cleanup

- Fjernet værtemperatur fra header, slik at klokke og dato står renere.
- Lot områdekortet eie sted, temperatur og værtype uten ekstra stemningstekst.
- Strammet dagskortene til mer strukturelle rytmekort med korte linjer og små steg.
- Flyttet `Lite steg`-inngangen til footer-linjen og la til lukking med backdrop og Escape for paneler.
- Skilte kveld tydeligere fra natt med egen ikonform og friere kveldsspråk.
- Gjorde tåke litt mer synlig med et ekstra horisontalt dislag.

## DEV 1.5 - Små steg

- La til skjult `Lite steg`-input med lokal lagring i nettleseren.
- Plasserer korte input regelstyrt i Morgen, Jobb, Kveld eller Natt.
- Viser små steg diskret i dagskortene, med enkel markering som gjort eller fjerning.
- Gjorde tåke mer synlig i værbakgrunnen.
- Strammet tekstflater for å redusere overlapp og trange hitboxer.

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
