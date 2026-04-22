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

export type SectionTitle = "Morgen" | "Jobb" | "Kveld" | "Natt";

export type Section = {
  title: SectionTitle;
  time: string;
  mantra: string;
  prompt: string;
  status: "Nå" | "Senere" | "Gjort";
};

export type SmallStep = {
  id: string;
  text: string;
  scope: "today" | "week";
  sectionTitle: SectionTitle;
  createdAt: string;
  done: boolean;
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
