import type { SectionTitle, WeatherScene } from "../types/weather";

export function parseWeatherScene(symbolCode: string, periodName: SectionTitle): WeatherScene {
  const code = (symbolCode || "").toLowerCase();
  const isNight = periodName === "Natt";

  const isShowers = code.includes("showers");
  const isThunder = code.includes("thunder");
  const isHeavy = code.includes("heavy");
  const isLight = code.includes("light");

  let precipitation: WeatherScene["precipitation"] = "none";
  if (code.includes("sleet")) precipitation = "sleet";
  else if (code.includes("snow")) precipitation = "snow";
  else if (code.includes("rain") || code.includes("drizzle") || isShowers) precipitation = "rain";

  let sky: WeatherScene["sky"] = "clear";
  if (isThunder) sky = "storm";
  else if (code.includes("fog")) sky = "foggy";
  else if (code.includes("partlycloudy") || code.includes("fair")) sky = "partly_cloudy";
  else if (code.includes("cloudy")) sky = "cloudy";
  else if (code.includes("clearsky")) sky = "clear";
  else if (precipitation !== "none") sky = "cloudy";

  let wind: WeatherScene["wind"] = "calm";
  if (isThunder || isHeavy) wind = "windy";
  else if (isShowers || precipitation !== "none" || code.includes("partlycloudy")) wind = "breezy";

  let intensity: WeatherScene["intensity"] = "moderate";
  if (isThunder || isHeavy) intensity = "heavy";
  else if (isLight || code.includes("fair")) intensity = "light";

  if (code.includes("heavyrainandthunder")) {
    sky = "storm";
    precipitation = "rain";
    wind = "windy";
    intensity = "heavy";
  }

  if (code.includes("snowshowers")) {
    precipitation = "snow";
    wind = "breezy";
    intensity = isHeavy ? "heavy" : "moderate";
  }

  if (code.includes("rainshowers")) {
    precipitation = "rain";
    wind = "breezy";
    intensity = isHeavy ? "heavy" : "moderate";
  }

  if (code.includes("lightsleet") || code.includes("heavysleet")) {
    precipitation = "sleet";
  }

  if (code.includes("fair") && precipitation === "none") {
    sky = "partly_cloudy";
    wind = "calm";
    intensity = "light";
  }

  return {
    sky,
    precipitation,
    wind,
    thunder: isThunder,
    intensity,
    isNight,
  };
}
