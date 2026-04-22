import type { SectionTitle, WeatherViewModel } from "../types/weather";

export function getGreeting(sectionTitle: SectionTitle) {
  const map: Record<SectionTitle, string> = {
    Morgen: "God morgen",
    Jobb: "God dag",
    Kveld: "God kveld",
    Natt: "God natt",
  };

  return map[sectionTitle];
}

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean) {
  if (isLoadingWeather) {
    return "Øyeblikk. Rytmen og været hentes inn.";
  }

  const condition = weather.conditionLabel.toLowerCase();
  const period = sectionTitle.toLowerCase();

  if (sectionTitle === "Morgen") {
    return `Det er ${condition} ute. Starten kan få være rolig. Nå er det morgen.`;
  }

  if (sectionTitle === "Jobb") {
    return `Det er ${condition} ute. Hold én ting av gangen. Nå er det dag.`;
  }

  if (sectionTitle === "Kveld") {
    return `Det er ${condition} ute. ${getWeatherSummary(weather)} Nå er det ${period}.`;
  }

  return `Det er ${condition} ute. La resten slippe taket. Nå er det natt.`;
}

export function buildLocationVibe(sectionTitle: SectionTitle, weather: WeatherViewModel) {
  const weatherLine = getWeatherSummary(weather);

  if (sectionTitle === "Morgen") {
    return `En myk start. ${weatherLine}`;
  }

  if (sectionTitle === "Jobb") {
    return `En stødig rytme. ${weatherLine}`;
  }

  if (sectionTitle === "Kveld") {
    return `En mild kveld. ${weatherLine}`;
  }

  return `En rolig natt. ${weatherLine}`;
}

export function getWeatherSummary(weather: WeatherViewModel) {
  const code = weather.symbolCode.toLowerCase();

  if (code.includes("thunder")) return "Perfekt for å gjøre mindre.";
  if (code.includes("heavyrain")) return "Regnet gir rom for å roe ned.";
  if (code.includes("rain")) return "Perfekt for å senke skuldrene.";
  if (code.includes("snow")) return "Verden blir litt stillere.";
  if (code.includes("sleet")) return "Hold rytmen enkel.";
  if (code.includes("fog")) return "Se bare neste steg.";
  if (code.includes("cloudy")) return "Skyene legger et rolig lokk over dagen.";
  if (code.includes("fair") || code.includes("partlycloudy")) return "Lyset slipper rolig gjennom.";
  if (code.includes("clearsky")) return "Det er rom for litt mer luft.";

  return weather.vibe;
}
