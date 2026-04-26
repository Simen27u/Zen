import type { SectionTitle, SupportedLanguage, WeatherViewModel } from "../types/weather";

type WeatherMood = "clear" | "partly" | "cloudy" | "fog" | "rain" | "heavyRain" | "snow" | "sleet" | "storm" | "quiet";

type TextContext = {
  sectionTitle: SectionTitle;
  weather: WeatherViewModel;
  mood: WeatherMood;
  language: SupportedLanguage;
};

const greetings: Record<SupportedLanguage, Record<SectionTitle, string>> = {
  no: {
    Morgen: "God morgen",
    Dag: "God formiddag",
    Ettermiddag: "God ettermiddag",
    Kveld: "God kveld",
    Natt: "God natt",
  },
  en: {
    Morgen: "Good morning",
    Dag: "Good morning",
    Ettermiddag: "Good afternoon",
    Kveld: "Good evening",
    Natt: "Good night",
  },
};

const periodLines: Record<SupportedLanguage, Record<SectionTitle, string[]>> = {
  no: {
    Morgen: ["La dagen begynne lavt.", "Start med det som er nært.", "Gi morgenen litt rom.", "Finn ro før fart."],
    Dag: ["La formiddagen være tydelig.", "Hold én ting foran deg.", "La fokuset være smalt.", "Velg det viktigste først."],
    Ettermiddag: ["Dagen er ikke tapt.", "Et lite reset teller.", "La kroppen få komme etter.", "Litt luft er nok."],
    Kveld: ["Dagen kan få slippe taket.", "La tempoet falle.", "Gjør kvelden smalere.", "Roligere lys, roligere rytme."],
    Natt: ["Resten kan vente.", "Nå er det lov å stoppe.", "La kroppen få siste ord.", "Natten trenger ikke fylles."],
  },
  en: {
    Morgen: ["Let the day begin low.", "Start with what is close.", "Give the morning a little room.", "Find calm before pace."],
    Dag: ["Let the late morning stay clear.", "Keep one thing in front of you.", "Let the focus stay narrow.", "Choose the most important thing first."],
    Ettermiddag: ["The day is not lost.", "A small reset counts.", "Let the body catch up.", "A little air can be enough."],
    Kveld: ["The day can start letting go.", "Let the pace fall.", "Make the evening smaller.", "Lower light, calmer rhythm."],
    Natt: ["The rest can wait.", "It is allowed to stop now.", "Let the body have the last word.", "The night does not need to be filled."],
  },
};

const weatherLines: Record<SupportedLanguage, Record<WeatherMood, string[]>> = {
  no: {
    clear: ["Klarvær gir litt mer luft.", "Lyset gjør dagen tydeligere.", "Ute er det åpent og klart."],
    partly: ["Lyset slipper rolig gjennom.", "Skyene åpner dagen litt.", "Været ligger mykt mellom lys og skygge."],
    cloudy: ["Skyene demper dagen.", "Været har en lavere tone.", "Himmelen legger et rolig lokk over alt."],
    fog: ["Horisonten kan få være uklar.", "Det nære er nok akkurat nå.", "Tåken gjør verden mindre."],
    rain: ["Regnet setter tempoet litt ned.", "Været inviterer til lavere skuldre.", "Regnet gir dagen en rolig puls."],
    heavyRain: ["Regnet tar plass, så du kan gjøre mindre.", "Været ber om færre ting.", "Hold rytmen lav."],
    snow: ["Snøen gjør verden stillere.", "Alt får en mykere kant.", "La tempoet falle med snøen."],
    sleet: ["Været skifter, men du trenger ikke.", "Hold rytmen praktisk og enkel.", "Gjør dagen litt smalere."],
    storm: ["Ro er et godt svar.", "Når været er høyt, kan du være lavere.", "Færre kanter er nok."],
    quiet: ["Været ligger stille i bakgrunnen.", "Dagen kan få sin egen rytme.", "Det enkle er nok."],
  },
  en: {
    clear: ["Clear weather gives the day more air.", "The light makes the day easier to read.", "Outside feels open and clear."],
    partly: ["Light comes through softly.", "The clouds open the day a little.", "The weather rests between light and shade."],
    cloudy: ["Clouds soften the day.", "The weather has a lower tone.", "The sky makes everything a little quieter."],
    fog: ["The horizon can stay unclear.", "What is close is enough right now.", "The fog makes the world smaller."],
    rain: ["The rain lowers the tempo a little.", "The weather invites lower shoulders.", "Rain gives the day a quiet pulse."],
    heavyRain: ["The rain takes space, so you can do less.", "The weather asks for fewer things.", "Keep the rhythm low."],
    snow: ["Snow makes the world quieter.", "Everything gets a softer edge.", "Let the pace fall with the snow."],
    sleet: ["The weather shifts, but you do not need to.", "Keep the rhythm practical and simple.", "Make the day a little narrower."],
    storm: ["Calm is a good answer.", "When the weather is loud, you can stay lower.", "Fewer edges are enough."],
    quiet: ["The weather rests in the background.", "The day can find its own rhythm.", "The simple thing is enough."],
  },
};

export function getGreeting(sectionTitle: SectionTitle, language: SupportedLanguage = "no") {
  return greetings[language][sectionTitle];
}

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean, language: SupportedLanguage = "no") {
  if (isLoadingWeather) {
    return language === "en" ? "One moment. Zen is bringing in the weather and rhythm." : "Øyeblikk. Rytmen og været hentes inn.";
  }

  const context = buildTextContext(sectionTitle, weather, language);
  const weatherLine = selectText(weatherLines[language][context.mood], context, weather.vibe);
  const periodLine = selectText(periodLines[language][sectionTitle], context, language === "en" ? "Let the day find its rhythm." : "La dagen få sin rytme.");

  return `${weatherLine} ${periodLine}`;
}

export function getWeatherSummary(weather: WeatherViewModel, language: SupportedLanguage = "no") {
  const context = buildTextContext("Kveld", weather, language);
  return selectText(weatherLines[language][context.mood], context, weather.vibe);
}

function buildTextContext(sectionTitle: SectionTitle, weather: WeatherViewModel, language: SupportedLanguage): TextContext {
  return {
    sectionTitle,
    weather,
    mood: getWeatherMood(weather.symbolCode),
    language,
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
  const seed = `${today}:${context.language}:${context.sectionTitle}:${context.weather.symbolCode}`;
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
