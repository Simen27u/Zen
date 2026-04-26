import type { AppSettings, DayType, LifeArea, Section, SectionTitle, SupportedLanguage } from "../types/weather";

export const APP_SETTINGS_KEY = "zen_app_settings";

export const LIFE_AREA_OPTIONS: ReadonlyArray<{
  value: LifeArea;
  labels: Record<SupportedLanguage, string>;
  descriptions: Record<SupportedLanguage, string>;
}> = [
  {
    value: "energy",
    labels: { no: "Energi", en: "Energy" },
    descriptions: { no: "Lys, vann, bevegelse og pauser.", en: "Light, water, movement, and pauses." },
  },
  {
    value: "mood",
    labels: { no: "Humør", en: "Mood" },
    descriptions: { no: "Lavere press og små mestringsfølelser.", en: "Less pressure and small moments of steadiness." },
  },
  {
    value: "focus",
    labels: { no: "Fokus", en: "Focus" },
    descriptions: { no: "Én tydelig start, mindre kaos.", en: "One clear start, less clutter." },
  },
  {
    value: "training",
    labels: { no: "Trening", en: "Training" },
    descriptions: { no: "Lavterskel bevegelse.", en: "Low-threshold movement." },
  },
  {
    value: "food",
    labels: { no: "Mat", en: "Food" },
    descriptions: { no: "Enkel mat og regelmessighet.", en: "Simple food and regularity." },
  },
  {
    value: "home",
    labels: { no: "Hjem", en: "Home" },
    descriptions: { no: "Én liten flate eller ting på plass.", en: "One small surface or thing in place." },
  },
  {
    value: "social",
    labels: { no: "Sosialt", en: "Social" },
    descriptions: { no: "Liten kontakt uten stort press.", en: "Small contact without big pressure." },
  },
  {
    value: "reflection",
    labels: { no: "Refleksjon", en: "Reflection" },
    descriptions: { no: "Én tanke ned, litt mindre nattgrubling.", en: "One thought down, a little less night rumination." },
  },
  {
    value: "sleep",
    labels: { no: "Søvn", en: "Sleep" },
    descriptions: { no: "Lys ned, tempo ned, mer mørke.", en: "Lower light, lower tempo, more darkness." },
  },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "no",
  languageSource: "browser",
  selectedLifeAreas: ["energy", "sleep", "mood"],
  workDays: [1, 2, 3, 4, 5],
  aiTextEnabled: false,
  holidayAwarenessEnabled: true,
  localSuggestionsEnabled: false,
};

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;

  try {
    const saved = window.localStorage.getItem(APP_SETTINGS_KEY);
    if (!saved) return DEFAULT_APP_SETTINGS;

    return normalizeAppSettings(JSON.parse(saved));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings) {
  window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export function resolveAppLanguage(settings: AppSettings, countryCode?: string): SupportedLanguage {
  if (settings.languageSource === "manual") return settings.language;

  const browserLanguage = getBrowserLanguage();
  if (browserLanguage) return browserLanguage;

  if (countryCode?.toUpperCase() === "NO") return "no";
  return "en";
}

export function getDayTypeLabel(dayType: DayType | "auto", language: SupportedLanguage) {
  const labels: Record<SupportedLanguage, Record<DayType | "auto", string>> = {
    no: {
      auto: "Automatisk",
      weekday: "Hverdag",
      weekend: "Helg",
      free_day: "Fridag",
    },
    en: {
      auto: "Automatic",
      weekday: "Weekday",
      weekend: "Weekend",
      free_day: "Free day",
    },
  };

  return labels[language][dayType];
}

export function getSectionTitleLabel(sectionTitle: SectionTitle, language: SupportedLanguage) {
  const labels: Record<SupportedLanguage, Record<SectionTitle, string>> = {
    no: {
      Morgen: "Morgen",
      Dag: "Formiddag",
      Ettermiddag: "Ettermiddag",
      Kveld: "Kveld",
      Natt: "Natt",
    },
    en: {
      Morgen: "Morning",
      Dag: "Late morning",
      Ettermiddag: "Afternoon",
      Kveld: "Evening",
      Natt: "Night",
    },
  };

  return labels[language][sectionTitle];
}

export function getSectionStatusLabel(status: Section["status"], language: SupportedLanguage) {
  const labels: Record<SupportedLanguage, Record<Section["status"], string>> = {
    no: {
      Nå: "Nå",
      Senere: "Senere",
      Ferdig: "Ferdig",
    },
    en: {
      Nå: "Now",
      Senere: "Later",
      Ferdig: "Done",
    },
  };

  return labels[language][status];
}

export function getLanguageChoiceLabel(source: AppSettings["languageSource"], language: SupportedLanguage) {
  if (source === "manual") return language === "no" ? "Manuelt" : "Manual";
  if (source === "auto_location") return language === "no" ? "Lokasjon" : "Location";
  return language === "no" ? "Nettleser" : "Browser";
}

export function getWeekdayShortLabel(day: number, language: SupportedLanguage) {
  const labels: Record<SupportedLanguage, Record<number, string>> = {
    no: {
      1: "Man",
      2: "Tir",
      3: "Ons",
      4: "Tor",
      5: "Fre",
      6: "Lør",
      0: "Søn",
    },
    en: {
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
      0: "Sun",
    },
  };

  return labels[language][day];
}

function normalizeAppSettings(value: unknown): AppSettings {
  const maybe = value as Partial<AppSettings>;
  const selectedLifeAreas = Array.isArray(maybe.selectedLifeAreas)
    ? maybe.selectedLifeAreas.filter(isLifeArea).slice(0, 3)
    : DEFAULT_APP_SETTINGS.selectedLifeAreas;
  const workDays = normalizeWorkDays(maybe.workDays);
  const language = isSupportedLanguage(maybe.language) ? maybe.language : DEFAULT_APP_SETTINGS.language;
  const languageSource =
    maybe.languageSource === "manual" || maybe.languageSource === "browser" || maybe.languageSource === "auto_location"
      ? maybe.languageSource
      : DEFAULT_APP_SETTINGS.languageSource;
  const dayTypeOverride = isDayType(maybe.dayTypeOverride) ? maybe.dayTypeOverride : undefined;

  return {
    language,
    languageSource,
    selectedLifeAreas,
    workDays,
    aiTextEnabled: Boolean(maybe.aiTextEnabled),
    holidayAwarenessEnabled: true,
    localSuggestionsEnabled: Boolean(maybe.localSuggestionsEnabled),
    dayTypeOverride,
  };
}

function normalizeWorkDays(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_APP_SETTINGS.workDays;

  const days = [...new Set(value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return days.length ? days : DEFAULT_APP_SETTINGS.workDays;
}

function getBrowserLanguage(): SupportedLanguage | null {
  if (typeof navigator === "undefined") return null;

  const languages = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith("nb") || normalized.startsWith("nn") || normalized.startsWith("no")) return "no";
    if (normalized.startsWith("en")) return "en";
  }

  return null;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "no" || value === "en";
}

function isLifeArea(value: unknown): value is LifeArea {
  return LIFE_AREA_OPTIONS.some((option) => option.value === value);
}

function isDayType(value: unknown): value is DayType {
  return value === "weekday" || value === "weekend" || value === "free_day";
}
