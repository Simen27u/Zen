# Zen - Lokalisering, innstillinger og helligdager

Dette er retningen for første MVP-runde med språk, settings og helligdager.

## Mål

Zen skal fortsatt ha en rolig hovedflate. Mer avanserte valg skal ligge i et eget sidepanel, ikke på forsiden.

MVP skal bruke:
- React/Vite frontend
- Express backend
- localStorage
- ingen database
- ingen Gemini/KI i denne runden

## Innstillinger

Settings-panelet skal inneholde:
- språk: Auto, Norsk, English
- livsområder, maks 3
- dagtype: Automatisk, Hverdag, Helg, Fridag
- helligdager på/av
- lokale forslag som eksperimentelt og avskrudd

Språk skal kunne foreslås automatisk fra nettleser først, og lokasjon som fallback. Brukeren skal alltid kunne overstyre manuelt.

## Hilsener og faser

Dagen deles inn i:
- morning / Morgen: 06:00-09:00
- day / Formiddag: 09:00-12:00
- afternoon / Ettermiddag: 12:00-18:00
- evening / Kveld: 18:00-00:00
- night / Natt: 00:00-06:00

Internt kan `day` fortsatt brukes som fase-id for formiddag, slik at lagrede data og eksisterende logikk ikke brekker.

Hilsener:
- Norsk: God morgen, God formiddag, God ettermiddag, God kveld, God natt
- Engelsk: Good morning, Good morning, Good afternoon, Good evening, Good night

## Helligdager

Frontend skal aldri kalle API Ninjas direkte.

Backend-endepunkt:

```txt
GET /api/holidays?country=NO&year=2026
```

Backend leser API-nøkkel fra:

```txt
API_NINJAS_KEY
```

Hvis nøkkel mangler, API feiler, eller landet ikke støttes, skal backend bruke fallback. For Norge finnes lokal fallback med norske offentlige helligdager.

Helligdag skal brukes som rytmekontekst:
- sett dagtype til `free_day` når helligdagsbevissthet er på
- gi mykere fridagstekst
- ikke gjøre dagen til et produktivitetsprosjekt

## Lokale forslag

Ikke bygg ekte lokalt arrangementssøk nå.

Legg bare grunnlag og settings-valg:
- `localSuggestionsEnabled: false`
- vis som eksperimentelt / kommer senere
- ingen eksterne kall

## Viktige grenser

Ikke legg API-nøkkel i frontend, README eller Git.
Ikke legg til database i MVP.
Ikke implementer Gemini/KI i denne runden.
Ikke opprett ny versjon, commit eller push uten eksplisitt beskjed.
