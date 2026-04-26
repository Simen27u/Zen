import type { SectionTitle, SupportedLanguage } from "../types/weather";

const localeByLanguage: Record<SupportedLanguage, string> = {
  no: "nb-NO",
  en: "en-US",
};

export function formatDate(date: Date, language: SupportedLanguage = "no") {
  return new Intl.DateTimeFormat(localeByLanguage[language], {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatTime(date: Date, language: SupportedLanguage = "no") {
  return new Intl.DateTimeFormat(localeByLanguage[language], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getPeriodName(date: Date): SectionTitle {
  const hour = date.getHours();

  if (hour >= 6 && hour < 9) return "Morgen";
  if (hour >= 9 && hour < 12) return "Dag";
  if (hour >= 12 && hour < 18) return "Ettermiddag";
  if (hour >= 18) return "Kveld";
  return "Natt";
}

export function prettifySymbolCode(symbolCode?: string, language: SupportedLanguage = "no") {
  const labels: Record<SupportedLanguage, Record<string, string>> = {
    no: {
      clearsky_day: "Klarvær",
      clearsky_night: "Klar natt",
      clearsky_polartwilight: "Klarvær",
      fair_day: "Pent vær",
      fair_night: "Rolig natt",
      fair_polartwilight: "Pent vær",
      partlycloudy_day: "Delvis skyet",
      partlycloudy_night: "Delvis skyet",
      partlycloudy_polartwilight: "Delvis skyet",
      cloudy: "Overskyet",
      fog: "Tåke",
      lightrain: "Lett regn",
      rain: "Regn",
      heavyrain: "Kraftig regn",
      lightsnow: "Lett snø",
      snow: "Snø",
      heavysnow: "Kraftig snø",
      sleet: "Sludd",
      lightsleet: "Lett sludd",
      heavysleet: "Kraftig sludd",
      rainshowers_day: "Regnbyger",
      rainshowers_night: "Regnbyger",
      rainshowers_polartwilight: "Regnbyger",
      snowshowers_day: "Snøbyger",
      snowshowers_night: "Snøbyger",
      snowshowers_polartwilight: "Snøbyger",
      thunderstorm: "Tordenvær",
      heavyrainandthunder: "Kraftig regn og torden",
      lightrainandthunder: "Lett regn og torden",
      rainandthunder: "Regn og torden",
    },
    en: {
      clearsky_day: "Clear sky",
      clearsky_night: "Clear night",
      clearsky_polartwilight: "Clear sky",
      fair_day: "Fair weather",
      fair_night: "Calm night",
      fair_polartwilight: "Fair weather",
      partlycloudy_day: "Partly cloudy",
      partlycloudy_night: "Partly cloudy",
      partlycloudy_polartwilight: "Partly cloudy",
      cloudy: "Cloudy",
      fog: "Fog",
      lightrain: "Light rain",
      rain: "Rain",
      heavyrain: "Heavy rain",
      lightsnow: "Light snow",
      snow: "Snow",
      heavysnow: "Heavy snow",
      sleet: "Sleet",
      lightsleet: "Light sleet",
      heavysleet: "Heavy sleet",
      rainshowers_day: "Rain showers",
      rainshowers_night: "Rain showers",
      rainshowers_polartwilight: "Rain showers",
      snowshowers_day: "Snow showers",
      snowshowers_night: "Snow showers",
      snowshowers_polartwilight: "Snow showers",
      thunderstorm: "Thunderstorm",
      heavyrainandthunder: "Heavy rain and thunder",
      lightrainandthunder: "Light rain and thunder",
      rainandthunder: "Rain and thunder",
    },
  };

  return symbolCode ? labels[language][symbolCode] || (language === "en" ? "Calm weather" : "Rolig vær") : language === "en" ? "Calm weather" : "Rolig vær";
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
