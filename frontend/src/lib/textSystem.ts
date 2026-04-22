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

const periodLines: Record<SectionTitle, string[]> = {
  Morgen: [
    "La dagen begynne lavt.",
    "Start med det som er nært.",
    "Gi morgenen litt rom.",
    "Finn ro før fart.",
  ],
  Jobb: [
    "Hold én ting foran deg.",
    "La fokuset være smalt.",
    "Arbeid i rolige drag.",
    "Velg det viktigste først.",
  ],
  Kveld: [
    "Nå kan dagen få lande.",
    "Slipp litt av det som henger igjen.",
    "Ikke alt trenger å bli ferdig i dag.",
    "La tempoet falle.",
  ],
  Natt: [
    "Resten kan vente.",
    "Nå er det lov å stoppe.",
    "La kroppen få siste ord.",
    "Natten trenger ikke fylles.",
  ],
};

const weatherLines: Record<WeatherMood, string[]> = {
  clear: [
    "Klarvær gir litt mer luft.",
    "Lyset gjør dagen tydeligere.",
    "Ute er det åpent og klart.",
  ],
  partly: [
    "Lyset slipper rolig gjennom.",
    "Skyene åpner dagen litt.",
    "Været ligger mykt mellom lys og skygge.",
  ],
  cloudy: [
    "Skyene demper dagen.",
    "Været har en lavere tone.",
    "Himmelen legger et rolig lokk over alt.",
  ],
  fog: [
    "Horisonten kan få være uklar.",
    "Det nære er nok akkurat nå.",
    "Tåken gjør verden mindre.",
  ],
  rain: [
    "Regnet setter tempoet litt ned.",
    "Været inviterer til lavere skuldre.",
    "Regnet gir dagen en rolig puls.",
  ],
  heavyRain: [
    "Regnet tar plass, så du kan gjøre mindre.",
    "Været ber om færre ting.",
    "Hold rytmen lav.",
  ],
  snow: [
    "Snøen gjør verden stillere.",
    "Alt får en mykere kant.",
    "La tempoet falle med snøen.",
  ],
  sleet: [
    "Været skifter, men du trenger ikke.",
    "Hold rytmen praktisk og enkel.",
    "Gjør dagen litt smalere.",
  ],
  storm: [
    "Ro er et godt svar.",
    "Når været er høyt, kan du være lavere.",
    "Færre kanter er nok.",
  ],
  quiet: [
    "Været ligger stille i bakgrunnen.",
    "Dagen kan få sin egen rytme.",
    "Det enkle er nok.",
  ],
};

const locationOpeners: Record<SectionTitle, string[]> = {
  Morgen: ["En myk start.", "Rolig inngang.", "Liten start."],
  Jobb: ["En stødig rytme.", "Fokus i korte drag.", "Én ting av gangen."],
  Kveld: ["En mild kveld.", "Dagen kan lande.", "Skuldrene kan falle."],
  Natt: ["En rolig natt.", "Nok for i dag.", "La resten vente."],
};

export function getGreeting(sectionTitle: SectionTitle) {
  return greetings[sectionTitle];
}

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean) {
  if (isLoadingWeather) {
    return "Øyeblikk. Rytmen og været hentes inn.";
  }

  const context = buildTextContext(sectionTitle, weather);
  const condition = weather.conditionLabel.toLowerCase();
  const weatherLine = selectText(weatherLines[context.mood], context, weather.vibe);
  const periodLine = selectText(periodLines[sectionTitle], context, "La dagen få sin rytme.");

  return `Det er ${condition} ute. ${weatherLine} ${periodLine}`;
}

export function buildLocationVibe(sectionTitle: SectionTitle, weather: WeatherViewModel) {
  const context = buildTextContext(sectionTitle, weather);
  const opener = selectText(locationOpeners[sectionTitle], context, "Rolig rytme.");
  const weatherLine = selectText(weatherLines[context.mood], context, weather.vibe);

  return `${opener} ${weatherLine}`;
}

export function getWeatherSummary(weather: WeatherViewModel) {
  const context = buildTextContext("Kveld", weather);
  return selectText(weatherLines[context.mood], context, weather.vibe);
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
