import type { SectionTitle, WeatherViewModel } from "../types/weather";

type WeatherMood = "clear" | "partly" | "cloudy" | "fog" | "rain" | "heavyRain" | "snow" | "sleet" | "storm" | "quiet";

type TextContext = {
  sectionTitle: SectionTitle;
  weather: WeatherViewModel;
  mood: WeatherMood;
};

const greetings: Record<SectionTitle, string> = {
  Morgen: "God morgen",
  Jobb: "God dag",
  Kveld: "God kveld",
  Natt: "God natt",
};

const ambientLeadVariants: Record<SectionTitle, Partial<Record<WeatherMood, string[]>>> = {
  Morgen: {
    clear: [
      "Det er klart ute. La dagen begynne uten hast.",
      "Lyset er tydelig i dag. Start mykt, og ta én ting av gangen.",
      "Det er klarvær ute. Gi morgenen litt rom før tempoet øker.",
    ],
    partly: [
      "Lyset slipper rolig gjennom. Morgenen trenger ikke presses fram.",
      "Det er delvis skyet ute. Starten kan få være enkel.",
      "Skyene ligger lett over dagen. Begynn med det som er nærmest.",
    ],
    cloudy: [
      "Det er overskyet ute. La starten være dempet og stødig.",
      "Skyene legger et rolig lokk over morgenen. Du kan begynne mykt.",
      "Dagen åpner stille. Én rolig start er nok.",
    ],
    fog: [
      "Det er tåke ute. Se bare neste steg.",
      "Horisonten er myk i dag. Start med det du vet.",
      "Tåken gjør morgenen mindre. Det kan være en god ting.",
    ],
    rain: [
      "Det regner ute. La regnet sette tempoet litt ned.",
      "Regnet gjør starten roligere. Du trenger ikke skynde deg inn i dagen.",
      "Det er regn i luften. Begynn lavt og enkelt.",
    ],
    heavyRain: [
      "Regnet fyller rommet utenfor. Starten kan få være ekstra rolig.",
      "Det regner tungt ute. Gjør morgenen mindre.",
      "Kraftig regn ber om lavere tempo. Begynn med én ting.",
    ],
    snow: [
      "Snøen demper verden. La morgenen gjøre det samme.",
      "Det snør ute. Start stille.",
      "Snøen gjør dagen mykere. Begynn uten å presse.",
    ],
    sleet: [
      "Luften er rå og skiftende. Hold morgenen enkel.",
      "Det er sludd ute. Start med det trygge.",
      "Været skifter. Rytmen kan få være enkel.",
    ],
    storm: [
      "Det er uro i været. Gjør starten mindre.",
      "Torden og regn ber om ro. Begynn forsiktig.",
      "Ute er det kraft i været. Inne kan tempoet få falle.",
    ],
  },
  Jobb: {
    clear: [
      "Det er klart ute. Hold fokus rent og enkelt.",
      "Klarvær gir dagen mer rom. Velg én ting å følge.",
      "Lyset er tydelig. La arbeidet være like tydelig.",
    ],
    partly: [
      "Det er delvis skyet ute. Finn flyten i små steg.",
      "Lyset kommer i glimt. Arbeidet kan også få gå i rolige drag.",
      "Skyene åpner litt. Hold rytmen enkel.",
    ],
    cloudy: [
      "Det er overskyet ute. En stødig rytme er nok.",
      "Skyene gjør dagen dempet. Hold én ting foran deg.",
      "Dagen er rolig i tonen. La fokuset være rolig også.",
    ],
    fog: [
      "Det er tåke ute. Se bare neste oppgave.",
      "Når horisonten er uklar, er neste steg nok.",
      "Tåken minner deg på å jobbe nært og enkelt.",
    ],
    rain: [
      "Det regner ute. Hold tempoet jevnt.",
      "Regnet legger en rytme rundt dagen. Følg én ting av gangen.",
      "Det er regn i bakgrunnen. La arbeidet få en rolig puls.",
    ],
    heavyRain: [
      "Regnet er tungt ute. Gjør arbeidsdagen smalere.",
      "Kraftig regn ber om mindre friksjon. Velg det viktigste.",
      "Været tar plass. Du trenger bare neste fokuspunkt.",
    ],
    snow: [
      "Det snør ute. La fokuset bli stille og tydelig.",
      "Snøen demper dagen. Arbeid i små rolige etapper.",
      "Verden er mykere ute. Hold arbeidet enkelt inne.",
    ],
    sleet: [
      "Det er sludd ute. Hold rytmen praktisk og enkel.",
      "Været er skiftende. Arbeid med korte steg.",
      "Rå luft ute, enkel rytme inne.",
    ],
    storm: [
      "Det er uro i været. Velg bort det du kan.",
      "Torden ute, færre kanter inne.",
      "Når været er høyt, kan arbeidsdagen være lavere.",
    ],
  },
  Kveld: {
    clear: [
      "Det er klart ute. Nå kan dagen få lande.",
      "Klar luft gir kvelden mer rom. Slipp litt taket.",
      "Lyset er rolig. Du kan også være det.",
    ],
    partly: [
      "Det er delvis skyet ute. Lyset slipper rolig gjennom.",
      "Skyene ligger mykt over kvelden. Nå kan tempoet falle.",
      "Kvelden er halvlys og ro. Ikke alt trenger å gjøres i dag.",
    ],
    cloudy: [
      "Det er overskyet ute. Skyene legger et rolig lokk over dagen.",
      "Kvelden er dempet. La resten vente.",
      "Skyene gjør dagen mykere. Nå kan skuldrene falle.",
    ],
    fog: [
      "Det er tåke ute. Kvelden trenger bare neste lille steg.",
      "Tåken gjør verden mindre. La kvelden bli enkel.",
      "Horisonten er myk. Du kan slippe litt av dagen.",
    ],
    rain: [
      "Det regner ute. Perfekt for å senke skuldrene.",
      "Regnet gir kvelden en rolig rytme. La dagen lande.",
      "Det er regn i luften. Resten kan vente.",
    ],
    heavyRain: [
      "Regnet fyller kvelden. Gjør mindre.",
      "Kraftig regn ute, lavere tempo inne.",
      "Været tar over litt. Du trenger ikke bære hele dagen videre.",
    ],
    snow: [
      "Snøen demper verden. La kvelden gjøre det samme.",
      "Det snør ute. Dagen kan få falle stille på plass.",
      "Snøen gjør kvelden mykere. Slipp taket litt.",
    ],
    sleet: [
      "Det er sludd ute. Hold kvelden varm og enkel.",
      "Luften er rå. Kvelden kan få være myk.",
      "Været skifter ute. Inne kan rytmen være rolig.",
    ],
    storm: [
      "Det er kraft i været. Gjør kvelden mindre.",
      "Torden ute. Ro inne.",
      "Når været tar plass, kan du slippe litt mer.",
    ],
  },
  Natt: {
    clear: [
      "Det er klart ute. La kroppen få en tydelig slutt på dagen.",
      "Klar natt. Resten kan vente.",
      "Luften er stille. Slipp dagen sakte.",
    ],
    partly: [
      "Det er delvis skyet ute. Natten trenger ikke fylles.",
      "Skyene glir rolig. La tankene gjøre det samme.",
      "Kvelden slipper taket. Natten kan være enkel.",
    ],
    cloudy: [
      "Det er overskyet ute. La mørket gjøre jobben sin.",
      "Skyene demper natten. Resten kan ligge.",
      "Natten er lav og rolig. Du kan være ferdig nå.",
    ],
    fog: [
      "Det er tåke ute. Du trenger ikke se lenger enn til hvile.",
      "Tåken gjør verden liten. La natten være liten også.",
      "Horisonten er borte. Det er lov å stoppe.",
    ],
    rain: [
      "Det regner ute. La lyden bære natten.",
      "Regnet holder rytmen. Du kan slippe din.",
      "Det er regn i mørket. Resten kan vente til morgen.",
    ],
    heavyRain: [
      "Regnet er tungt ute. La kroppen bli tung nok til å hvile.",
      "Kraftig regn ute. Ingen hast inne.",
      "Været fyller natten. Du trenger ikke fylle den.",
    ],
    snow: [
      "Snøen demper verden. La kroppen gjøre det samme.",
      "Det snør ute. Natten kan få være stille.",
      "Snøen legger seg. La dagen legge seg også.",
    ],
    sleet: [
      "Det er sludd ute. Hold natten enkel og varm.",
      "Rå luft ute. Myk landing inne.",
      "Været skifter. Du kan stoppe.",
    ],
    storm: [
      "Det er uro i været. Du trenger ikke møte den.",
      "Torden ute. Hvile inne.",
      "Været får rase fra seg. Natten kan få holde deg rolig.",
    ],
  },
};

const locationVibeVariants: Record<SectionTitle, string[]> = {
  Morgen: ["En myk start.", "Rolig inngang.", "Liten start, nok for nå."],
  Jobb: ["En stødig rytme.", "Fokus i korte drag.", "Én ting av gangen."],
  Kveld: ["En mild kveld.", "Dagen kan få lande.", "Perfekt for å senke skuldrene."],
  Natt: ["En rolig natt.", "Nok for i dag.", "La resten vente."],
};

const weatherSummaryVariants: Record<WeatherMood, string[]> = {
  clear: ["Det er rom for litt mer luft.", "Lyset gjør dagen tydeligere.", "Klarvær gir litt ekstra rom."],
  partly: ["Lyset slipper rolig gjennom.", "Skyene åpner dagen litt.", "Det er mykt lys i været."],
  cloudy: ["Skyene legger et rolig lokk over dagen.", "Været er dempet.", "Dagen har en lavere tone."],
  fog: ["Se bare neste steg.", "Horisonten kan få være uklar.", "Det nære er nok akkurat nå."],
  rain: ["Perfekt for å senke skuldrene.", "Regnet gir rom for å roe ned.", "Været setter tempoet litt ned."],
  heavyRain: ["Gjør mindre.", "Regnet tar plass, så du kan slippe litt.", "Hold rytmen lav."],
  snow: ["Verden blir litt stillere.", "Snøen gjør alt mykere.", "La tempoet falle."],
  sleet: ["Hold rytmen enkel.", "Gjør det praktisk og rolig.", "Været skifter, men du trenger ikke."],
  storm: ["Perfekt for å gjøre mindre.", "Færre kanter er nok.", "Ro er et godt svar."],
  quiet: ["Været ligger stille i bakgrunnen.", "Dagen kan få sin egen rytme.", "Det enkle er nok."],
};

export function getGreeting(sectionTitle: SectionTitle) {
  return greetings[sectionTitle];
}

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean) {
  if (isLoadingWeather) {
    return "Øyeblikk. Rytmen og været hentes inn.";
  }

  const context = buildTextContext(sectionTitle, weather);
  const fallback = `Det er ${weather.conditionLabel.toLowerCase()} ute. ${getWeatherSummary(weather)} Nå er det ${sectionTitle.toLowerCase()}.`;

  return selectText(ambientLeadVariants[sectionTitle][context.mood], context, fallback);
}

export function buildLocationVibe(sectionTitle: SectionTitle, weather: WeatherViewModel) {
  const context = buildTextContext(sectionTitle, weather);
  const intro = selectText(locationVibeVariants[sectionTitle], context, "Rolig rytme.");
  const weatherLine = getWeatherSummary(weather);

  return `${intro} ${weatherLine}`;
}

export function getWeatherSummary(weather: WeatherViewModel) {
  const mood = getWeatherMood(weather.symbolCode);
  const context = buildTextContext("Kveld", weather);

  return selectText(weatherSummaryVariants[mood], context, weather.vibe);
}

function buildTextContext(sectionTitle: SectionTitle, weather: WeatherViewModel): TextContext {
  return {
    sectionTitle,
    weather,
    mood: getWeatherMood(weather.symbolCode),
  };
}

function getWeatherMood(symbolCode: string): WeatherMood {
  const code = symbolCode.toLowerCase();

  if (code.includes("thunder")) return "storm";
  if (code.includes("heavyrain")) return "heavyRain";
  if (code.includes("rain")) return "rain";
  if (code.includes("snow")) return "snow";
  if (code.includes("sleet")) return "sleet";
  if (code.includes("fog")) return "fog";
  if (code.includes("partlycloudy") || code.includes("fair")) return "partly";
  if (code.includes("cloudy")) return "cloudy";
  if (code.includes("clearsky")) return "clear";

  return "quiet";
}

function selectText(options: string[] | undefined, context: TextContext, fallback: string) {
  if (!options?.length) return fallback;

  const today = new Intl.DateTimeFormat("sv-SE").format(new Date());
  const seed = `${today}:${context.sectionTitle}:${context.weather.symbolCode}`;
  const index = hashString(seed) % options.length;

  return options[index];
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}
