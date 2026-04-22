import type { SectionTitle, WeatherViewModel } from "../types/weather";

export function buildAmbientLead(sectionTitle: SectionTitle, weather: WeatherViewModel, isLoadingWeather: boolean) {
  if (isLoadingWeather) {
    return "Øyeblikk. Rytmen og været hentes inn.";
  }

  const weatherSentence = weather.conditionLabel.toLowerCase();

  if (sectionTitle === "Morgen") {
    return `Det er ${weatherSentence} ute. ${weather.vibe} Nå er det morgen.`;
  }

  if (sectionTitle === "Jobb") {
    return `Det er ${weatherSentence} ute. ${weather.vibe} Nå er det jobb.`;
  }

  if (sectionTitle === "Kveld") {
    return `Det er ${weatherSentence} ute. ${weather.vibe} Nå er det kveld.`;
  }

  return `Det er ${weatherSentence} ute. ${weather.vibe} Nå er det natt.`;
}
