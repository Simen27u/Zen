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
    Morgen: ["Start rolig.", "Ta én ting om gangen.", "Begynn enkelt.", "Få litt lys først."],
    Dag: ["Velg én ting å starte med.", "Hold det enkelt.", "Ta det viktigste først.", "Gjør det litt mindre."],
    Ettermiddag: ["Du kan justere litt nå.", "Ta en kort pause.", "Begynn litt på nytt.", "Velg et mindre neste steg."],
    Kveld: ["Senk tempoet litt.", "La resten vente.", "Gjør kvelden enklere.", "Demp lyset litt."],
    Natt: ["Resten kan vente.", "Hold det enkelt nå.", "Ikke legg til nye krav nå.", "Legg bort skjermen litt."],
  },
  en: {
    Morgen: ["Start slowly.", "Take the morning bit by bit.", "Begin with something simple.", "A little light first."],
    Dag: ["Choose one thing to start with.", "Keep it simple.", "Start with what matters.", "Make it a little smaller."],
    Ettermiddag: ["You can adjust a little now.", "Take a short pause.", "Start again in a small way.", "Choose a smaller next step."],
    Kveld: ["Slow down a little.", "Let the rest wait.", "Make the evening simpler.", "Lower the light a little."],
    Natt: ["The rest can wait.", "Keep it simple now.", "Do not add new demands now.", "Put the screen away for a bit."],
  },
};

const weatherLines: Record<SupportedLanguage, Record<WeatherMood, string[]>> = {
  no: {
    clear: ["Det er klart ute.", "Det er lyst ute.", "Ute er det lett å få dagslys."],
    partly: ["Lyset slipper gjennom.", "Det er litt lys mellom skyene.", "Været er rolig."],
    cloudy: ["Det er overskyet ute.", "Dagen er litt dempet.", "Grått dagslys hjelper også."],
    fog: ["Det er tåkete ute.", "Sikten er kortere i dag.", "Gjør det nærmeste først."],
    rain: ["Det regner ute.", "Regnet gjør tempoet lavere.", "Ta en roligere start."],
    heavyRain: ["Det regner mye ute.", "Været tar litt plass i dag.", "Hold planen liten."],
    snow: ["Det snør ute.", "Snøen gjør dagen roligere.", "Gjør starten enkel."],
    sleet: ["Det er sludd ute.", "Været skifter litt.", "Hold det praktisk."],
    storm: ["Været er urolig ute.", "Gjør mindre hvis du trenger det.", "Hold dagen enkel."],
    quiet: ["Været er rolig.", "Dagen kan være enkel.", "Det enkle holder."],
  },
  en: {
    clear: ["It is clear outside.", "The light is easy to find today.", "There is good daylight outside."],
    partly: ["Some light is coming through.", "There is light between the clouds.", "The weather is calm enough."],
    cloudy: ["It is cloudy outside.", "The day is a little muted.", "Even grey light helps."],
    fog: ["It is foggy outside.", "Visibility is shorter today.", "Keep the day close and simple."],
    rain: ["It is raining outside.", "The rain lowers the pace a little.", "A quiet day still counts."],
    heavyRain: ["It is raining hard outside.", "The weather takes some space today.", "Keep the plan small."],
    snow: ["It is snowing outside.", "The snow makes the day quieter.", "Make the start simple."],
    sleet: ["It is sleeting outside.", "The weather is a bit mixed.", "Keep it practical today."],
    storm: ["The weather is unsettled outside.", "Do less if you need to.", "Keep the day simple."],
    quiet: ["The weather is quiet.", "The day can stay simple.", "Simple is enough."],
  },
};

export function getGreeting(sectionTitle: SectionTitle, language: SupportedLanguage = "no") {
  return greetings[language][sectionTitle];
}

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean, language: SupportedLanguage = "no") {
  if (isLoadingWeather) {
    return language === "en" ? "One moment. Zen is fetching weather." : "Et øyeblikk. Zen henter været.";
  }

  const context = buildTextContext(sectionTitle, weather, language);
  const weatherLine = selectText(weatherLines[language][context.mood], context, weather.vibe);
  const periodLine = selectText(periodLines[language][sectionTitle], context, language === "en" ? "Keep it simple." : "Hold det enkelt.");

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
