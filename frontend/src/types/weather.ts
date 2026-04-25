export type WeatherApiResponse = {
  weather?: {
    temperature?: number | null;
    symbolCode?: string;
    vibe?: string;
    text?: string;
  };
  meta?: {
    locationName?: string;
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

export type SectionTitle = "Morgen" | "Fokus" | "Pause" | "Kveld" | "Natt";

export type Section = {
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
