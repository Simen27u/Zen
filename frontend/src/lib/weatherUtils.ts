import type { SectionTitle } from "../types/weather";

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getPeriodName(date: Date): SectionTitle {
  const hour = date.getHours();

  if (hour >= 6 && hour < 10) return "Morgen";
  if (hour >= 10 && hour < 15) return "Fokus";
  if (hour >= 15 && hour < 18) return "Pause";
  if (hour >= 18 && hour < 22) return "Kveld";
  return "Natt";
}

export function prettifySymbolCode(symbolCode?: string) {
  const map: Record<string, string> = {
    clearsky_day: "Klarvær",
    clearsky_night: "Klar natt",
    fair_day: "Pent vær",
    fair_night: "Rolig natt",
    partlycloudy_day: "Delvis skyet",
    partlycloudy_night: "Delvis skyet",
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
  };

  return symbolCode ? map[symbolCode] || "Rolig vær" : "Rolig vær";
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
