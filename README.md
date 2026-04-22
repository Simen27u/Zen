# Zen

Zen er nå satt opp som en lokal DEV-versjon, ikke bare en mockup.

Appen består av to deler:

- `frontend/`: React + TypeScript + Vite. Dette er det du ser i nettleseren.
- `backend/`: Node + Express. Dette henter værdata fra MET/Yr og gir frontend et enkelt API.

## Krav

Installer Node.js først hvis du ikke allerede har det:

https://nodejs.org/

Velg LTS-versjonen. Den inkluderer `npm`, som er verktøyet som installerer og kjører pakkene prosjektet trenger.

Sjekk etterpå i terminalen:

```bash
node --version
npm --version
```

Hvis begge kommandoene viser versjonsnummer, er du klar.

## Første gang

Åpne to terminaler i prosjektmappen:

```bash
cd C:\Users\mioud\OneDrive\Documents\Zen
```

Installer backend-pakker:

```bash
cd backend
npm install
```

Installer frontend-pakker:

```bash
cd ..\frontend
npm install
```

Dette lager `node_modules/`-mapper. De skal ikke redigeres manuelt; de er bare nedlastede verktøy og biblioteker.

## Kjør appen lokalt

Du trenger to terminaler åpne samtidig.

Den enkleste måten er å kjøre dette fra prosjektmappen:

```powershell
.\start-dev.ps1
```

Scriptet sjekker at Node.js og `npm` finnes, installerer pakker hvis `node_modules/` mangler, starter backend og frontend i hvert sitt terminalvindu, og åpner frontend i nettleseren.

Hvis PowerShell stopper scriptet på grunn av sikkerhetsregler, kjør:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start-dev.ps1
```

Manuell måte:

Terminal 1, backend:

```bash
cd C:\Users\mioud\OneDrive\Documents\Zen\backend
npm run dev
```

Backend kjører da på:

```text
http://localhost:3001
```

Terminal 2, frontend:

```bash
cd C:\Users\mioud\OneDrive\Documents\Zen\frontend
npm run dev
```

Frontend kjører vanligvis på:

```text
http://localhost:3000
```

Åpne den adressen i nettleseren.

## Hvordan dataflyten fungerer

Frontend spør backend:

```text
GET http://localhost:3001/api/weather?lat=59.9139&lon=10.7522
```

Backend spør MET/Yr, rydder svaret og returnerer:

```json
{
  "weather": {
    "temperature": 6,
    "symbolCode": "rain",
    "vibe": "Været inviterer til å senke skuldrene.",
    "text": "6° ute og regn. Været inviterer til å senke skuldrene."
  },
  "meta": {
    "locationName": "Oslo"
  }
}
```

Hvis backend ikke svarer, bruker frontend reservevær slik at UI-et fortsatt fungerer.

## Nyttige filer

- `frontend/src/components/ZenDayUI.tsx`: hovedskjermen.
- `frontend/src/components/AmbientBackdrop.tsx`: animert værbakgrunn.
- `frontend/src/lib/weatherScene.ts`: oversetter `symbolCode` til regn, snø, tåke, storm osv.
- `frontend/src/lib/weatherPalette.ts`: bestemmer farger etter vær og tid på dagen.
- `frontend/src/lib/textSystem.ts`: enkel regelstyrt tekst i frontend.
- `backend/server.js`: Express-serveren og MET/Yr-integrasjonen.
