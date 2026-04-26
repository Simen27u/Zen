export type WeatherApiResponse = {
  weather?: {
    temperature?: number | null;
    symbolCode?: string;
    vibe?: string;
    text?: string;
  };
  meta?: {
    locationName?: string;
    countryCode?: string;
  };
};

export type WeatherViewModel = {
  sourceLabel: string;
  temperature: number | null;
  conditionLabel: string;
  vibe: string;
  text: string;
  symbolCode: string;
};

export type DayPhase = "morning" | "day" | "afternoon" | "evening" | "night";

export type DayType = "weekday" | "weekend" | "free_day";

export type SupportedLanguage = "no" | "en";

export type LanguageSource = "browser" | "auto_location" | "manual";

export type LifeArea =
  | "energy"
  | "mood"
  | "focus"
  | "training"
  | "food"
  | "home"
  | "social"
  | "reflection"
  | "sleep";

export type SectionTitle = "Morgen" | "Dag" | "Ettermiddag" | "Kveld" | "Natt";

export type Section = {
  phase: DayPhase;
  title: SectionTitle;
  time: string;
  mantra: string;
  prompt: string;
  status: "Nå" | "Senere" | "Ferdig";
};

export type SmallStep = {
  id: string;
  text: string;
  scope: "today" | "week";
  sectionTitle: SectionTitle;
  createdAt: string;
  done: boolean;
};

export type Chronotype = "morning" | "intermediate" | "evening" | "unknown";

export type RhythmState =
  | "stable"
  | "slightly_shifted"
  | "delayed"
  | "unstable"
  | "social_jetlag"
  | "unknown";

export type RhythmFeeling =
  | "best_early"
  | "best_later"
  | "tired_all_day"
  | "unstable"
  | "weekday_weekend_diff";

export type RhythmProfile = {
  chronotype: Chronotype;
  rhythmState: RhythmState;
  rhythmFeeling: RhythmFeeling;
  usualBedtime: string;
  usualWake: string;
  desiredWake: string;
  weekdaySleepTime: string;
  weekdayWakeTime: string;
  weekendSleepTime: string;
  weekendWakeTime: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  language: SupportedLanguage;
  languageSource: LanguageSource;
  selectedLifeAreas: LifeArea[];
  workDays: number[];
  aiTextEnabled: boolean;
  holidayAwarenessEnabled: boolean;
  localSuggestionsEnabled: boolean;
  dayTypeOverride?: DayType;
};

export type HolidayInfo = {
  date: string;
  name: string;
  type: string;
};

export type HolidaysApiResponse = {
  country: string;
  iso: string;
  year: number;
  source: "api_ninjas" | "fallback_no" | "fallback_empty";
  holidays: HolidayInfo[];
};

export type LocalOpportunityCategory = "event" | "nature" | "social" | "culture" | "movement" | "quiet_place";

export type LocalOpportunity = {
  id: string;
  title: string;
  description?: string;
  locationName?: string;
  distanceMeters?: number;
  startsAt?: string;
  source?: string;
  category: LocalOpportunityCategory;
  rhythmFit: Exclude<DayPhase, "night">;
};

export type LocalSuggestionsApiRequest = {
  phase: DayPhase;
  dayType: DayType;
  language: SupportedLanguage;
  date: string;
  locationName?: string;
  countryCode?: string;
  weatherSymbol?: string;
  temperature?: number | null;
  lifeAreas: LifeArea[];
};

export type LocalSuggestionsApiResponse = {
  source: "gemini" | "fallback";
  generatedAt: string;
  note: string;
  suggestions: LocalOpportunity[];
};

export type Palette = {
  background: string;
  glowA: string;
  glowB: string;
  glowC: string;
};

export type WeatherScene = {
  sky: "clear" | "partly_cloudy" | "cloudy" | "foggy" | "storm";
  precipitation: "none" | "rain" | "snow" | "sleet";
  wind: "calm" | "breezy" | "windy";
  thunder: boolean;
  intensity: "light" | "moderate" | "heavy";
  isNight: boolean;
};
