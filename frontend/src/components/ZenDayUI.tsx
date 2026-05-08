import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import AmbientBackdrop from "./AmbientBackdrop";
import { fetchBackendStatus, fetchZenText } from "../lib/aiTextClient";
import { fetchLocalSuggestions } from "../lib/localSuggestions";
import { buildAmbientLead, getGreeting, getWeatherSummary } from "../lib/textSystem";
import { getWeatherPalette } from "../lib/weatherPalette";
import { parseWeatherScene } from "../lib/weatherScene";
import {
  getDayTypeLabel,
  getLanguageChoiceLabel,
  getSectionStatusLabel,
  getSectionTitleLabel,
  getWeekdayShortLabel,
  LIFE_AREA_OPTIONS,
  loadAppSettings,
  resolveAppLanguage,
  saveAppSettings,
} from "../lib/settings";
import {
  RHYTHM_FEELING_OPTIONS,
  RHYTHM_PROFILE_KEY,
  buildDailyNudges,
  buildRhythmAnchors,
  buildRhythmPlan,
  buildRhythmSections,
  getCurrentRhythmPhase,
  getPhasePreviewDate,
  getPhaseState,
  getProfileSignalsFromFeeling,
  getRhythmCalendarContext,
  getRhythmProgress,
  isValidClockTime,
  normalizeSectionTitle,
  type RhythmCalendarContext,
  type RhythmAnchor,
  type RhythmNudge,
  type RhythmPlan,
} from "../lib/rhythm";
import { formatDate, formatTime, prettifySymbolCode } from "../lib/weatherUtils";
import type {
  AppSettings,
  BackendStatusResponse,
  DayPhase,
  DayType,
  HolidayInfo,
  HolidaysApiResponse,
  LifeArea,
  LocalSuggestionsApiResponse,
  RhythmProfile,
  SectionTitle,
  SmallStep,
  SupportedLanguage,
  WeatherApiResponse,
  WeatherViewModel,
  ZenTextApiResponse,
} from "../types/weather";

const DEFAULT_LAT = 59.9139;
const DEFAULT_LON = 10.7522;
const WEATHER_URL = import.meta.env.VITE_WEATHER_URL || "http://localhost:3001/api/weather";
const HOLIDAYS_URL = WEATHER_URL.replace(/\/api\/weather$/, "/api/holidays");
const LOCAL_SUGGESTIONS_URL = WEATHER_URL.replace(/\/api\/weather$/, "/api/local-suggestions");
const STATUS_URL = WEATHER_URL.replace(/\/api\/weather$/, "/api/status");
const ZEN_TEXT_URL = WEATHER_URL.replace(/\/api\/weather$/, "/api/zen-text");
const SMALL_STEPS_KEY = "zen_small_steps";

type RhythmProfileInput = Pick<
  RhythmProfile,
  "rhythmFeeling" | "usualBedtime" | "usualWake" | "desiredWake" | "weekdaySleepTime" | "weekdayWakeTime" | "weekendSleepTime" | "weekendWakeTime"
>;

const fallbackWeather: WeatherViewModel = {
  sourceLabel: "Standardsted",
  temperature: 6,
  conditionLabel: "Regn",
  vibe: "Været inviterer til å senke skuldrene.",
  text: "6° ute og regn. Været inviterer til å senke skuldrene.",
  symbolCode: "rain",
};

const weatherSamples = [
  { labels: { no: "Klarvær", en: "Clear sky" }, symbolCode: "clearsky_day", temperature: 18 },
  { labels: { no: "Delvis skyet", en: "Partly cloudy" }, symbolCode: "partlycloudy_day", temperature: 19 },
  { labels: { no: "Overskyet", en: "Cloudy" }, symbolCode: "cloudy", temperature: 14 },
  { labels: { no: "Tåke", en: "Fog" }, symbolCode: "fog", temperature: 8 },
  { labels: { no: "Regn", en: "Rain" }, symbolCode: "rain", temperature: 9 },
  { labels: { no: "Kraftig regn", en: "Heavy rain" }, symbolCode: "heavyrain", temperature: 7 },
  { labels: { no: "Snø", en: "Snow" }, symbolCode: "snow", temperature: -2 },
  { labels: { no: "Sludd", en: "Sleet" }, symbolCode: "sleet", temperature: 2 },
  { labels: { no: "Storm", en: "Storm" }, symbolCode: "heavyrainandthunder", temperature: 11 },
] as const;


function buildSourceLabel(locationName: string | undefined, source: string) {
  if (source === "Standardsted") return "Standardsted";
  if (!locationName) return source;
  if (source === "Brukerens område" || source === "Sist brukte område") {
    return `Nær ${locationName}`;
  }
  return locationName;
}
const timeSamples = [
  { label: "Live", sectionTitle: null },
  { label: "Morgen", sectionTitle: "Morgen" },
  { label: "Formiddag", sectionTitle: "Dag" },
  { label: "Ettermiddag", sectionTitle: "Ettermiddag" },
  { label: "Kveld", sectionTitle: "Kveld" },
  { label: "Natt", sectionTitle: "Natt" },
] as const satisfies ReadonlyArray<{ label: string; sectionTitle: SectionTitle | null }>;

export default function ZenDayUI() {
  const [now, setNow] = useState<Date>(new Date());
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [weatherError, setWeatherError] = useState<string>("");
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [weatherOverride, setWeatherOverride] = useState<(typeof weatherSamples)[number] | null>(null);
  const [sectionOverride, setSectionOverride] = useState<SectionTitle | null>(null);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState<boolean>(false);
  const [smallSteps, setSmallSteps] = useState<SmallStep[]>(() => loadSmallSteps());
  const [isSmallStepOpen, setIsSmallStepOpen] = useState<boolean>(false);
  const [rhythmProfile, setRhythmProfile] = useState<RhythmProfile | null>(() => loadRhythmProfile());
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const [isRhythmSetupOpen, setIsRhythmSetupOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !window.localStorage.getItem(RHYTHM_PROFILE_KEY);
  });
  const [isRhythmDrawerOpen, setIsRhythmDrawerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [holidaysData, setHolidaysData] = useState<HolidaysApiResponse | null>(null);
  const [holidayError, setHolidayError] = useState<string>("");
  const [holidayOverride, setHolidayOverride] = useState<HolidayInfo | null>(null);
  const [testDateOverride, setTestDateOverride] = useState<string>("");
  const [testDayTypeOverride, setTestDayTypeOverride] = useState<DayType | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<LocalSuggestionsApiResponse | null>(null);
  const [isLoadingLocalSuggestions, setIsLoadingLocalSuggestions] = useState<boolean>(false);
  const [localSuggestionsError, setLocalSuggestionsError] = useState<string>("");
  const [backendStatus, setBackendStatus] = useState<BackendStatusResponse | null>(null);
  const [backendStatusError, setBackendStatusError] = useState<string>("");
  const [zenText, setZenText] = useState<ZenTextApiResponse | null>(null);
  const [isLoadingZenText, setIsLoadingZenText] = useState<boolean>(false);
  const [zenTextError, setZenTextError] = useState<string>("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWeatherForCoords(lat: number, lon: number, source = "Brukerens område") {
      try {
        setIsLoadingWeather(true);
        setWeatherError("");

        const response = await fetch(`${WEATHER_URL}?lat=${lat}&lon=${lon}`);
        if (!response.ok) {
          throw new Error("Kunne ikke hente værdata");
        }

        const data = (await response.json()) as WeatherApiResponse;
        if (!isMounted) return;

        setWeatherData(data);
        setUserLocation({
          lat,
          lon,
          label: buildSourceLabel(data.meta?.locationName, source),
        });
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Noe gikk galt ved henting av værdata";
        setWeatherError(message);
      } finally {
        if (isMounted) {
          setIsLoadingWeather(false);
        }
      }
    }

    function loadFallbackWeather() {
      void loadWeatherForCoords(DEFAULT_LAT, DEFAULT_LON, "Standardsted");
    }

    const savedLat = window.localStorage.getItem("zen_lat");
    const savedLon = window.localStorage.getItem("zen_lon");

    if (savedLat && savedLon) {
      void loadWeatherForCoords(Number(savedLat), Number(savedLon), "Sist brukte område");
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          window.localStorage.setItem("zen_lat", String(latitude));
          window.localStorage.setItem("zen_lon", String(longitude));
          void loadWeatherForCoords(latitude, longitude, "Brukerens område");
        },
        () => {
          loadFallbackWeather();
        },
        {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 30 * 60 * 1000,
        }
      );
    } else {
      loadFallbackWeather();
    }

    const refreshTimer = window.setInterval(() => {
      const lat = window.localStorage.getItem("zen_lat");
      const lon = window.localStorage.getItem("zen_lon");

      if (lat && lon) {
        void loadWeatherForCoords(Number(lat), Number(lon), "Brukerens område");
      } else {
        loadFallbackWeather();
      }
    }, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SMALL_STEPS_KEY, JSON.stringify(smallSteps));
  }, [smallSteps]);

  useEffect(() => {
    saveAppSettings(appSettings);
  }, [appSettings]);

  useEffect(() => {
    let isMounted = true;

    async function loadBackendStatus() {
      try {
        setBackendStatusError("");
        const status = await fetchBackendStatus(STATUS_URL);
        if (isMounted) {
          setBackendStatus(status);
        }
      } catch (error) {
        if (!isMounted) return;
        setBackendStatus(null);
        setBackendStatusError(error instanceof Error ? error.message : "Kunne ikke hente backend-status");
      }
    }

    void loadBackendStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window.history.scrollRestoration === "string") {
      window.history.scrollRestoration = "manual";
    }

    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }, []);

  useEffect(() => {
    function closePanelsOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsTestPanelOpen(false);
      setIsSmallStepOpen(false);
      setIsRhythmDrawerOpen(false);
      setIsSettingsOpen(false);
    }

    window.addEventListener("keydown", closePanelsOnEscape);
    return () => window.removeEventListener("keydown", closePanelsOnEscape);
  }, []);

  const countryCode = (weatherData?.meta?.countryCode || "NO").toUpperCase();
  const language = useMemo(() => resolveAppLanguage(appSettings, countryCode), [appSettings, countryCode]);
  const baseNow = useMemo(() => buildTestDateTime(now, testDateOverride), [now, testDateOverride]);
  const rhythmPlan = useMemo(() => buildRhythmPlan(rhythmProfile), [rhythmProfile]);
  const holidayYear = baseNow.getFullYear();
  const baseIsoDate = useMemo(() => toLocalIsoDate(baseNow), [baseNow]);

  useEffect(() => {
    let isMounted = true;

    if (!appSettings.holidayAwarenessEnabled) {
      setHolidaysData(null);
      setHolidayError("");
      return () => {
        isMounted = false;
      };
    }

    async function loadHolidays() {
      try {
        setHolidayError("");
        const response = await fetch(`${HOLIDAYS_URL}?country=${encodeURIComponent(countryCode)}&year=${holidayYear}`);
        if (!response.ok) {
          throw new Error("Kunne ikke hente helligdager");
        }

        const data = (await response.json()) as HolidaysApiResponse;
        if (isMounted) {
          setHolidaysData(data);
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Kunne ikke hente helligdager";
        setHolidayError(message);
        setHolidaysData(null);
      }
    }

    void loadHolidays();

    return () => {
      isMounted = false;
    };
  }, [appSettings.holidayAwarenessEnabled, countryCode, holidayYear]);

  const calendarHoliday = useMemo(
    () => (appSettings.holidayAwarenessEnabled ? holidaysData?.holidays.find((holiday) => holiday.date === baseIsoDate) || null : null),
    [appSettings.holidayAwarenessEnabled, holidaysData, baseIsoDate]
  );
  const todayHoliday = holidayOverride || calendarHoliday;
  const dayType = useMemo(
    () => testDayTypeOverride || inferDayType(baseNow, Boolean(todayHoliday && appSettings.holidayAwarenessEnabled), appSettings.workDays),
    [appSettings.holidayAwarenessEnabled, appSettings.workDays, baseNow, testDayTypeOverride, todayHoliday]
  );
  const liveSectionTitle = useMemo(() => getCurrentRhythmPhase(baseNow, rhythmPlan, dayType), [baseNow, dayType, rhythmPlan]);
  const activeSectionTitle = sectionOverride || liveSectionTitle;
  const displayNow = useMemo(() => getPhasePreviewDate(baseNow, sectionOverride, rhythmPlan, dayType), [baseNow, dayType, sectionOverride, rhythmPlan]);
  const dateLabel = useMemo(() => formatDate(displayNow, language), [displayNow, language]);
  const displayTimeLabel = useMemo(() => formatTime(displayNow, language), [displayNow, language]);
  const dayProgress = useMemo(() => getRhythmProgress(displayNow, rhythmPlan, dayType), [dayType, displayNow, rhythmPlan]);

  const liveWeather: WeatherViewModel = weatherData?.weather
    ? {
        sourceLabel: weatherData.meta?.locationName || userLocation?.label || (language === "en" ? "Unknown area" : "Ukjent område"),
        temperature: weatherData.weather.temperature ?? null,
        conditionLabel: prettifySymbolCode(weatherData.weather.symbolCode, language),
        vibe: weatherData.weather.vibe || fallbackWeather.vibe,
        text: weatherData.weather.text || fallbackWeather.text,
        symbolCode: weatherData.weather.symbolCode || fallbackWeather.symbolCode,
      }
    : {
        ...fallbackWeather,
        sourceLabel: weatherData?.meta?.locationName || userLocation?.label || fallbackWeather.sourceLabel,
        conditionLabel: prettifySymbolCode(fallbackWeather.symbolCode, language),
        vibe: getWeatherSummary(fallbackWeather, language),
        text: language === "en" ? `${fallbackWeather.temperature}° outside and ${prettifySymbolCode(fallbackWeather.symbolCode, language).toLowerCase()}.` : fallbackWeather.text,
      };

  const displayWeather: WeatherViewModel = weatherOverride
    ? {
        sourceLabel: liveWeather.sourceLabel,
        temperature: weatherOverride.temperature,
        conditionLabel: weatherOverride.labels[language],
        vibe: getWeatherSummary({
          ...liveWeather,
          temperature: weatherOverride.temperature,
          symbolCode: weatherOverride.symbolCode,
        }, language),
        text:
          language === "en"
            ? `${weatherOverride.temperature}° outside and ${prettifySymbolCode(weatherOverride.symbolCode, language).toLowerCase()}.`
            : `${weatherOverride.temperature}° ute og ${prettifySymbolCode(weatherOverride.symbolCode, language).toLowerCase()}.`,
        symbolCode: weatherOverride.symbolCode,
      }
    : liveWeather;

  const scene = useMemo(
    () => parseWeatherScene(displayWeather.symbolCode, activeSectionTitle),
    [displayWeather.symbolCode, activeSectionTitle]
  );
  const sections = useMemo(() => buildRhythmSections(rhythmPlan, activeSectionTitle, dayType, language), [activeSectionTitle, dayType, language, rhythmPlan]);
  const activeDayPhase = useMemo<DayPhase>(() => sections.find((section) => section.title === activeSectionTitle)?.phase || "day", [activeSectionTitle, sections]);
  const rhythmNudges = useMemo(
    () => buildDailyNudges(rhythmPlan, activeSectionTitle, displayWeather, appSettings.selectedLifeAreas, dayType, language),
    [activeSectionTitle, appSettings.selectedLifeAreas, dayType, displayWeather, language, rhythmPlan]
  );
  const rhythmAnchors = useMemo(() => buildRhythmAnchors(rhythmPlan, activeSectionTitle, displayWeather, language), [activeSectionTitle, displayWeather, language, rhythmPlan]);
  const rhythmCalendar = useMemo(
    () =>
      getRhythmCalendarContext(displayNow, rhythmPlan, {
        dayType,
        holiday: todayHoliday,
        holidayAwarenessEnabled: appSettings.holidayAwarenessEnabled,
        language,
      }),
    [appSettings.holidayAwarenessEnabled, dayType, displayNow, language, rhythmPlan, todayHoliday]
  );
  const baseAmbientLead = useMemo(
    () => buildAmbientLead(activeSectionTitle, displayWeather, isLoadingWeather && !weatherOverride, language),
    [activeSectionTitle, displayWeather, isLoadingWeather, language, weatherOverride]
  );

  useEffect(() => {
    let isMounted = true;

    if (!appSettings.aiTextEnabled || isLoadingWeather) {
      setZenText(null);
      setZenTextError("");
      setIsLoadingZenText(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadZenText() {
      try {
        setIsLoadingZenText(true);
        setZenTextError("");

        const data = await fetchZenText(ZEN_TEXT_URL, {
          phase: activeDayPhase,
          dayType,
          language,
          date: baseIsoDate,
          weatherSymbol: displayWeather.symbolCode,
          temperature: displayWeather.temperature,
          rhythmState: rhythmPlan.rhythmState,
          lifeAreas: appSettings.selectedLifeAreas,
          baseMessage: baseAmbientLead,
        });

        if (isMounted) {
          setZenText(data);
        }
      } catch (error) {
        if (!isMounted) return;
        setZenText(null);
        setZenTextError(error instanceof Error ? error.message : "Kunne ikke hente Zen-tekst");
      } finally {
        if (isMounted) {
          setIsLoadingZenText(false);
        }
      }
    }

    void loadZenText();

    return () => {
      isMounted = false;
    };
  }, [
    activeDayPhase,
    appSettings.aiTextEnabled,
    appSettings.selectedLifeAreas,
    baseAmbientLead,
    baseIsoDate,
    dayType,
    displayWeather.symbolCode,
    displayWeather.temperature,
    isLoadingWeather,
    language,
    rhythmPlan.rhythmState,
  ]);

  const ambientLead = appSettings.aiTextEnabled && zenText?.text ? zenText.text : baseAmbientLead;

  useEffect(() => {
    let isMounted = true;

    if (!appSettings.localSuggestionsEnabled) {
      setLocalSuggestions(null);
      setLocalSuggestionsError("");
      setIsLoadingLocalSuggestions(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadLocalSuggestions() {
      try {
        setIsLoadingLocalSuggestions(true);
        setLocalSuggestionsError("");

        const data = await fetchLocalSuggestions(LOCAL_SUGGESTIONS_URL, {
          phase: activeDayPhase,
          dayType,
          language,
          date: baseIsoDate,
          locationName: displayWeather.sourceLabel,
          countryCode,
          weatherSymbol: displayWeather.symbolCode,
          temperature: displayWeather.temperature,
          lifeAreas: appSettings.selectedLifeAreas,
        });

        if (isMounted) {
          setLocalSuggestions(data);
        }
      } catch (error) {
        if (!isMounted) return;
        setLocalSuggestions(null);
        setLocalSuggestionsError(error instanceof Error ? error.message : "Kunne ikke hente lokale forslag");
      } finally {
        if (isMounted) {
          setIsLoadingLocalSuggestions(false);
        }
      }
    }

    void loadLocalSuggestions();

    return () => {
      isMounted = false;
    };
  }, [
    activeDayPhase,
    appSettings.localSuggestionsEnabled,
    appSettings.selectedLifeAreas,
    baseIsoDate,
    countryCode,
    dayType,
    displayWeather.sourceLabel,
    displayWeather.symbolCode,
    displayWeather.temperature,
    language,
  ]);

  const palette = useMemo(() => getWeatherPalette(scene, displayNow), [scene, displayNow]);
  const weatherIcon = getWeatherIcon(displayWeather.symbolCode, activeSectionTitle);
  const isAnyPanelOpen = isTestPanelOpen || isSmallStepOpen || isRhythmDrawerOpen || isSettingsOpen;

  function handleAddSmallStep(text: string, scope: SmallStep["scope"]) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const step: SmallStep = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      text: trimmed,
      scope,
      sectionTitle: placeSmallStep(trimmed, activeSectionTitle),
      createdAt: new Date().toISOString(),
      done: false,
    };

    setSmallSteps((steps) => [step, ...steps].slice(0, 24));
  }

  function handleToggleSmallStep(id: string) {
    setSmallSteps((steps) => steps.map((step) => (step.id === id ? { ...step, done: !step.done } : step)));
  }

  function handleRemoveSmallStep(id: string) {
    setSmallSteps((steps) => steps.filter((step) => step.id !== id));
  }

  function handleSaveRhythmProfile(values: RhythmProfileInput) {
    const timestamp = new Date().toISOString();
    const profileSignals = getProfileSignalsFromFeeling(values.rhythmFeeling);
    const nextProfile: RhythmProfile = {
      ...values,
      ...profileSignals,
      createdAt: rhythmProfile?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    setRhythmProfile(nextProfile);
    window.localStorage.setItem(RHYTHM_PROFILE_KEY, JSON.stringify(nextProfile));
    setIsRhythmSetupOpen(false);
  }

  function handleSelectTestLanguage(nextLanguage: SupportedLanguage | "auto") {
    setAppSettings((current) =>
      nextLanguage === "auto"
        ? { ...current, languageSource: "browser" }
        : { ...current, language: nextLanguage, languageSource: "manual" }
    );
  }

  function handleSelectTestDayType(nextDayType: DayType | "auto") {
    setTestDayTypeOverride(nextDayType === "auto" ? null : nextDayType);
  }

  function handleToggleTestHoliday() {
    if (holidayOverride) {
      setHolidayOverride(null);
      return;
    }

    setAppSettings((settings) => ({ ...settings, holidayAwarenessEnabled: true }));
    setHolidayOverride({
      date: baseIsoDate,
      name: language === "en" ? "Test free day" : "Testfridag",
      type: "DEV_HOLIDAY",
    });
  }

  function handleResetTestTools() {
    setWeatherOverride(null);
    setSectionOverride(null);
    setHolidayOverride(null);
    setTestDateOverride("");
    setTestDayTypeOverride(null);
    setAppSettings((current) => {
      const { dayTypeOverride: _dayTypeOverride, ...rest } = current;
      return { ...rest, languageSource: "browser" };
    });
  }

  return (
    <div
      className="relative min-h-[100svh] overflow-x-hidden text-white transition-[background] duration-[12000ms] ease-linear"
      style={{ background: palette.background }}
    >
      <AmbientBackdrop palette={palette} scene={scene} />

      <div className="relative z-10 w-full">
        <div className="w-full">
          <div className="mx-auto flex min-h-[100svh] w-full max-w-[88rem] flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-8 lg:py-9">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 lg:pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/[0.48]">Zen</p>
            <h1 className="mt-5 text-5xl font-semibold leading-none tracking-normal text-white sm:text-6xl lg:text-7xl">
              {getGreeting(activeSectionTitle, language)}
            </h1>
          </div>

          <div className="shrink-0 flex flex-col items-start lg:items-end lg:pt-10">
            <div className="text-left lg:text-right">
              <p className="text-5xl font-light leading-none tracking-normal sm:text-6xl">{displayTimeLabel}</p>
              <p className="mt-3 text-sm text-white/[0.56]">{dateLabel}</p>
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-5 lg:mt-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.55fr)]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.11] px-6 py-7 shadow-2xl shadow-black/15 backdrop-blur-2xl sm:px-8 sm:py-8 lg:min-h-[20.5rem]">
            <div className="absolute inset-y-0 right-0 w-[55%] opacity-80">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgba(255,214,164,0.36),transparent_34%),radial-gradient(circle_at_45%_58%,rgba(255,255,255,0.14),transparent_42%)]" />
              <div className="absolute bottom-0 right-[-4%] h-40 w-[85%] rounded-t-full bg-white/[0.06] blur-2xl" />
              <div className="absolute bottom-10 right-[10%] h-24 w-[58%] rounded-full bg-white/[0.08] blur-xl" />
            </div>

            <div className="relative max-w-2xl pr-0 sm:pr-6">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/[0.58]">
                <SparkleIcon className="h-4 w-4" />
                {language === "en" ? "Now" : "Nå"}
              </p>
              <p className="mt-8 break-words text-3xl leading-tight text-white/[0.94] sm:text-4xl lg:text-[2.55rem]">
                {ambientLead}
              </p>
              <LocalSuggestionLine
                data={localSuggestions}
                enabled={appSettings.localSuggestionsEnabled}
                error={localSuggestionsError}
                isLoading={isLoadingLocalSuggestions}
                language={language}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/[0.11] bg-white/[0.1] px-6 py-7 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:px-8">
            <div className="mt-2 space-y-6">
              <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-4">
                <PinIcon className="mt-1 h-8 w-8 text-white/[0.62]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/[0.44]">{language === "en" ? "Area" : "Område"}</p>
                  <h2 className="mt-2 truncate text-3xl font-medium tracking-normal">{displayWeather.sourceLabel}</h2>
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-4">
                <WeatherGlyph icon={weatherIcon} className="mt-1 h-8 w-8 text-white/[0.86]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/[0.44]">{language === "en" ? "Weather" : "Vær"}</p>
                  <p className="mt-2 text-3xl font-semibold leading-none text-white">{isLoadingWeather && !weatherOverride ? "..." : `${displayWeather.temperature ?? "-"}°`}</p>
                  <p className="mt-2 truncate text-base text-white/[0.72]">{isLoadingWeather && !weatherOverride ? (language === "en" ? "Loading weather" : "Laster vær") : displayWeather.conditionLabel}</p>
                </div>
              </div>
            </div>

            {weatherError ? (
              <div className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/85">
                {language === "en"
                  ? "Weather could not be loaded right now. Zen is showing a saved area, default area, or fallback weather meanwhile."
                  : "Været kunne ikke hentes akkurat nå. Et lagret sted, standardsted eller reservevær vises i mellomtiden."}
              </div>
            ) : null}
          </section>
        </main>

        <section className="mt-10 lg:mt-12">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3 xl:gap-4">
            {sections.map((section) => {
              const state = getPhaseState(section.title, activeSectionTitle);
              const active = state === "active";
              const complete = state === "complete";
              const icon = getSectionIcon(section.title, dayType);
              const visibleSteps = smallSteps.filter((step) => step.sectionTitle === section.title && !isExpiredSmallStep(step)).slice(0, 3);

              return (
                <section
                  key={section.title}
                  className={`rounded-[1.65rem] border px-4 py-4 backdrop-blur-2xl transition-all duration-500 ${
                    active
                      ? "border-white/[0.34] bg-white/[0.16] shadow-2xl shadow-black/15"
                      : complete
                        ? "border-white/[0.07] bg-black/[0.055] opacity-55"
                        : "border-white/[0.1] bg-black/[0.08]"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${active ? "bg-white/[0.16]" : "bg-white/[0.09]"}`}>
                        <WeatherGlyph icon={icon} className="h-4.5 w-4.5 text-white/[0.86]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="whitespace-nowrap text-base font-semibold leading-tight 2xl:text-lg">{getSectionTitleLabel(section.title, language)}</h3>
                        <p className="mt-1 text-sm leading-5 text-white/[0.52]">{section.time}</p>
                        <span
                          className={`mt-3 inline-flex rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                            active ? "bg-white/[0.18] text-white/90" : complete ? "bg-white/[0.06] text-white/[0.38]" : "bg-white/[0.09] text-white/[0.5]"
                          }`}
                        >
                          {getSectionStatusLabel(section.status, language)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {active ? (
                    <div className="mt-6 space-y-2">
                      <p className="text-lg leading-7 text-white/[0.86]">{section.mantra}</p>
                      <p className="text-sm leading-6 text-white/[0.58]">{section.prompt}</p>
                    </div>
                  ) : (
                    <div className="mt-8 h-7" aria-hidden="true" />
                  )}
                  {visibleSteps.length ? (
                    <div className="mt-5 space-y-2 border-t border-white/[0.09] pt-4">
                      {visibleSteps.map((step) => (
                        <div key={step.id} className="group flex min-h-8 items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2">
                          <button
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border transition ${
                              step.done ? "border-white/[0.22] bg-white/[0.48]" : "border-white/[0.38] group-hover:border-white/[0.68]"
                            }`}
                            type="button"
                            aria-label={step.done ? "Marker som ikke gjort" : "Marker som gjort"}
                            onClick={() => handleToggleSmallStep(step.id)}
                          />
                          <span className={`min-w-0 flex-1 truncate text-sm ${step.done ? "text-white/[0.38] line-through" : "text-white/[0.76]"}`}>
                            {step.text}
                          </span>
                          <button
                            className="shrink-0 text-xs text-white/[0.32] opacity-0 transition hover:text-white/[0.75] group-hover:opacity-100"
                            type="button"
                            aria-label="Fjern lite steg"
                            onClick={() => handleRemoveSmallStep(step.id)}
                          >
                            Fjern
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          <div className="relative mt-5 h-8">
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.22]" />
            <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.38]" style={{ width: `${dayProgress}%` }} />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.35] bg-white shadow-[0_0_24px_rgba(255,220,175,0.75)]"
              style={{ left: `${dayProgress}%` }}
            />
          </div>

          <p className="mx-auto mt-3 flex max-w-full flex-wrap items-center justify-center gap-3 text-center text-base text-white/[0.56]">
            <LeafIcon className="h-5 w-5" />
            <span>{language === "en" ? "Small steps each day. More than enough over time." : "Små steg hver dag. Mer enn nok over tid."}</span>
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.14] bg-white/[0.08] text-xl font-light leading-none text-white/[0.72] transition hover:bg-white/[0.14] hover:text-white"
              type="button"
              aria-label={language === "en" ? "Add a small step" : "Legg til et lite steg"}
              onClick={() => setIsSmallStepOpen((open) => !open)}
            >
              +
            </button>
          </p>
        </section>
          </div>
        </div>
      </div>

      {isAnyPanelOpen ? (
        <button
          className="fixed inset-0 z-20 cursor-default bg-black/5 backdrop-blur-[1px]"
          type="button"
          aria-label={language === "en" ? "Close panel" : "Lukk panel"}
          onClick={() => {
            setIsTestPanelOpen(false);
            setIsSmallStepOpen(false);
            setIsRhythmDrawerOpen(false);
            setIsSettingsOpen(false);
          }}
        />
      ) : null}

      <SettingsDrawerToggle isOpen={isSettingsOpen} language={language} onToggle={() => setIsSettingsOpen((open) => !open)} />
      <RhythmDrawerToggle isOpen={isRhythmDrawerOpen} language={language} onToggle={() => setIsRhythmDrawerOpen((open) => !open)} />

      <DevTestPanel
        activeSample={weatherOverride?.symbolCode || ""}
        activeSection={sectionOverride}
        aiTextEnabled={appSettings.aiTextEnabled}
        backendStatus={backendStatus}
        backendStatusError={backendStatusError}
        dayType={dayType}
        dayTypeOverride={testDayTypeOverride}
        holidayOverride={holidayOverride}
        isOpen={isTestPanelOpen}
        language={language}
        localSuggestions={localSuggestions}
        localSuggestionsEnabled={appSettings.localSuggestionsEnabled}
        localSuggestionsError={localSuggestionsError}
        testDate={testDateOverride}
        weatherError={weatherError}
        zenText={zenText}
        zenTextError={zenTextError}
        zenTextLoading={isLoadingZenText}
        onClose={() => setIsTestPanelOpen(false)}
        onOpenRhythm={() => {
          setIsRhythmDrawerOpen(true);
          setIsSettingsOpen(false);
          setIsSmallStepOpen(false);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsRhythmDrawerOpen(false);
          setIsSmallStepOpen(false);
        }}
        onOpenSmallStep={() => {
          setIsSmallStepOpen(true);
          setIsRhythmDrawerOpen(false);
          setIsSettingsOpen(false);
        }}
        onReset={() => {
          setWeatherOverride(null);
          setSectionOverride(null);
          setTestDateOverride("");
        }}
        onResetAll={handleResetTestTools}
        onSelectDayType={handleSelectTestDayType}
        onSelectDate={setTestDateOverride}
        onSelectLanguage={handleSelectTestLanguage}
        onSelectSection={setSectionOverride}
        onSelect={(sample) => setWeatherOverride(sample)}
        onToggleHoliday={handleToggleTestHoliday}
        onToggleLocalSuggestions={() => setAppSettings((current) => ({ ...current, localSuggestionsEnabled: !current.localSuggestionsEnabled }))}
        onToggle={() => setIsTestPanelOpen((open) => !open)}
        settings={appSettings}
      />
      <SmallStepPanel
        isOpen={isSmallStepOpen}
        onAdd={handleAddSmallStep}
        onClose={() => setIsSmallStepOpen(false)}
      />
      <SettingsDrawer
        countryCode={countryCode}
        dayType={dayType}
        holiday={todayHoliday}
        holidayError={holidayError}
        holidaysSource={holidaysData?.source}
        isOpen={isSettingsOpen}
        language={language}
        settings={appSettings}
        onChange={setAppSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
      <RhythmDrawer
        activeSection={activeSectionTitle}
        anchors={rhythmAnchors}
        calendar={rhythmCalendar}
        hasProfile={Boolean(rhythmProfile)}
        isOpen={isRhythmDrawerOpen}
        isSetupOpen={isRhythmSetupOpen}
        language={language}
        nudges={rhythmNudges}
        onClose={() => setIsRhythmDrawerOpen(false)}
        onEdit={() => setIsRhythmSetupOpen(true)}
        onSave={handleSaveRhythmProfile}
        onSetupCancel={rhythmProfile ? () => setIsRhythmSetupOpen(false) : undefined}
        plan={rhythmPlan}
        profile={rhythmProfile}
      />
    </div>
  );
}

function SettingsDrawerToggle({ isOpen, language, onToggle }: { isOpen: boolean; language: SupportedLanguage; onToggle: () => void }) {
  return (
    <button
      className={`fixed right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] bg-black/[0.18] text-white/[0.78] shadow-2xl shadow-black/20 backdrop-blur-2xl transition hover:bg-white/[0.12] hover:text-white ${
        isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      type="button"
      aria-label={language === "en" ? "Open settings" : "Åpne innstillinger"}
      title={language === "en" ? "Settings" : "Innstillinger"}
      onClick={onToggle}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14" />
        <path d="M5 17h14" />
        <path d="M9 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" fill="currentColor" stroke="none" />
        <path d="M19 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

function SettingsDrawer({
  countryCode,
  dayType,
  holiday,
  holidayError,
  holidaysSource,
  isOpen,
  language,
  settings,
  onChange,
  onClose,
}: {
  countryCode: string;
  dayType: DayType;
  holiday: HolidayInfo | null;
  holidayError: string;
  holidaysSource?: HolidaysApiResponse["source"];
  isOpen: boolean;
  language: SupportedLanguage;
  settings: AppSettings;
  onChange: Dispatch<SetStateAction<AppSettings>>;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const maxLifeAreasSelected = settings.selectedLifeAreas.length >= 3;
  const workDayOrder = [1, 2, 3, 4, 5, 6, 0] as const;
  const copy = {
    title: language === "en" ? "Settings" : "Innstillinger",
    subtitle: language === "en" ? "Quiet choices that shape Zen without crowding the main screen." : "Rolige valg som former Zen uten å fylle forsiden.",
    language: language === "en" ? "Language" : "Språk",
    rhythmSupport: language === "en" ? "Rhythm support" : "Rytmestøtte",
    lifeAreas: language === "en" ? "Life areas" : "Livsområder",
    max3: language === "en" ? "Choose up to 3." : "Velg maks 3.",
    workDays: language === "en" ? "Work days" : "Arbeidsdager",
    workDaysHint:
      language === "en"
        ? "Zen uses this to understand weekdays, free days, and a softer weekend rhythm."
        : "Zen bruker dette til å forstå hverdager, fridager og en mykere helgerytme.",
    holidays: language === "en" ? "Holidays" : "Helligdager",
    aiText: language === "en" ? "Zen text" : "Zen-tekst",
    aiTextHint:
      language === "en"
        ? "Optional Gemini wording for the Now panel. The local text stays as fallback."
        : "Valgfri Gemini-formulering i Nå-panelet. Lokal tekst brukes alltid som fallback.",
    local: language === "en" ? "Local suggestions" : "Lokale forslag",
    localHint:
      language === "en"
        ? "Experimental contextual ideas. Gemini can help if the backend has a key, with local fallback otherwise."
        : "Eksperimentelle kontekstforslag. Gemini kan hjelpe hvis backend har nøkkel, med lokal reserve ellers.",
    country: language === "en" ? "Country" : "Land",
    today: language === "en" ? "Today" : "I dag",
    close: language === "en" ? "Close settings" : "Lukk innstillinger",
  };

  function setLanguageAuto() {
    onChange((current) => ({ ...current, languageSource: "browser", language }));
  }

  function setManualLanguage(nextLanguage: SupportedLanguage) {
    onChange((current) => ({ ...current, language: nextLanguage, languageSource: "manual" }));
  }

  function toggleLifeArea(lifeArea: LifeArea) {
    onChange((current) => {
      const selected = current.selectedLifeAreas.includes(lifeArea);
      if (selected) {
        return { ...current, selectedLifeAreas: current.selectedLifeAreas.filter((value) => value !== lifeArea) };
      }

      if (current.selectedLifeAreas.length >= 3) return current;
      return { ...current, selectedLifeAreas: [...current.selectedLifeAreas, lifeArea] };
    });
  }

  function toggleWorkDay(day: number) {
    onChange((current) => {
      const selected = current.workDays.includes(day);
      const nextWorkDays = selected ? current.workDays.filter((value) => value !== day) : [...current.workDays, day];
      const orderedWorkDays = workDayOrder.filter((value) => nextWorkDays.includes(value));

      if (!orderedWorkDays.length) return current;
      return { ...current, workDays: orderedWorkDays };
    });
  }

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-30 w-[min(31rem,calc(100vw-1rem))] overflow-y-auto border-l border-white/[0.14] bg-black/[0.22] px-5 py-5 text-white shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.48]">Zen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">{copy.title}</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/[0.55]">{copy.subtitle}</p>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] bg-white/[0.08] text-2xl leading-none text-white/[0.74] transition hover:bg-white/[0.14] hover:text-white"
          type="button"
          aria-label={copy.close}
          onClick={onClose}
        >
          &gt;
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <section className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.08] px-5 py-5 backdrop-blur-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.language}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Auto", active: settings.languageSource !== "manual", onClick: setLanguageAuto },
              { label: "Norsk", active: settings.languageSource === "manual" && settings.language === "no", onClick: () => setManualLanguage("no") },
              { label: "English", active: settings.languageSource === "manual" && settings.language === "en", onClick: () => setManualLanguage("en") },
            ].map((option) => (
              <button
                key={option.label}
                className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                  option.active ? "border-white/[0.34] bg-white/[0.16] text-white" : "border-white/[0.09] bg-white/[0.055] text-white/[0.65] hover:bg-white/[0.1]"
                }`}
                type="button"
                onClick={option.onClick}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-white/[0.48]">
            {getLanguageChoiceLabel(settings.languageSource, language)} · {copy.country}: {countryCode}
          </p>
        </section>

        <section className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.08] px-5 py-5 backdrop-blur-2xl">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.lifeAreas}</p>
              <p className="mt-2 text-sm text-white/[0.52]">{copy.max3}</p>
            </div>
            <span className="rounded-full bg-white/[0.1] px-3 py-1 text-xs font-bold text-white/[0.58]">
              {settings.selectedLifeAreas.length}/3
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {LIFE_AREA_OPTIONS.map((option) => {
              const active = settings.selectedLifeAreas.includes(option.value);
              const disabled = !active && maxLifeAreasSelected;
              return (
                <button
                  key={option.value}
                  className={`min-h-[5.25rem] rounded-[1.1rem] border px-3 py-3 text-left transition ${
                    active
                      ? "border-white/[0.34] bg-white/[0.16] text-white"
                      : disabled
                        ? "border-white/[0.06] bg-black/[0.08] text-white/[0.32]"
                        : "border-white/[0.09] bg-white/[0.055] text-white/[0.66] hover:bg-white/[0.1]"
                  }`}
                  type="button"
                  onClick={() => toggleLifeArea(option.value)}
                >
                  <span className="block text-sm font-semibold">{option.labels[language]}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/[0.46]">{option.descriptions[language]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.08] px-5 py-5 backdrop-blur-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.workDays}</p>
          <p className="mt-2 text-sm leading-6 text-white/[0.55]">{copy.workDaysHint}</p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {workDayOrder.map((day) => {
              const active = settings.workDays.includes(day);
              return (
                <button
                  key={day}
                  className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                    active ? "border-white/[0.34] bg-white/[0.16] text-white" : "border-white/[0.09] bg-white/[0.055] text-white/[0.55] hover:bg-white/[0.1]"
                  }`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWorkDay(day)}
                >
                  {getWeekdayShortLabel(day, language)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-white/[0.48]">
            {copy.today}: {getDayTypeLabel(dayType, language)}
            {holiday ? ` · ${holiday.name}` : ""}
          </p>
        </section>

        <section className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.08] px-5 py-5 backdrop-blur-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.holidays}</p>
          <p className="mt-2 text-sm leading-6 text-white/[0.55]">
            {language === "en"
              ? "Zen treats public holidays as a softer free-day context automatically."
              : "Zen behandler røde dager som en mykere fridagskontekst automatisk."}
          </p>
          <p className="mt-3 text-xs leading-5 text-white/[0.45]">
            {holidaysSource ? `Kilde: ${holidaysSource}` : language === "en" ? "Source: waiting for backend" : "Kilde: venter på backend"}
            {holidayError ? ` · ${holidayError}` : ""}
          </p>
        </section>

        <section className="rounded-[1.4rem] border border-white/[0.1] bg-black/[0.08] px-5 py-5 backdrop-blur-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.aiText}</p>
          <p className="mt-2 text-sm leading-6 text-white/[0.55]">{copy.aiTextHint}</p>
          <button
            className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              settings.aiTextEnabled
                ? "border-white/[0.3] bg-white/[0.15] text-white"
                : "border-white/[0.08] bg-white/[0.045] text-white/[0.55] hover:bg-white/[0.09]"
            }`}
            type="button"
            aria-pressed={settings.aiTextEnabled}
            onClick={() => onChange((current) => ({ ...current, aiTextEnabled: !current.aiTextEnabled }))}
          >
            <span>{language === "en" ? "AI wording" : "KI-formulering"}</span>
            <span className="font-semibold">{settings.aiTextEnabled ? (language === "en" ? "On" : "På") : language === "en" ? "Off" : "Av"}</span>
          </button>
        </section>

        <section className="rounded-[1.4rem] border border-white/[0.1] bg-black/[0.08] px-5 py-5 backdrop-blur-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.45]">{copy.local}</p>
          <p className="mt-2 text-sm leading-6 text-white/[0.55]">{copy.localHint}</p>
          <button
            className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              settings.localSuggestionsEnabled
                ? "border-white/[0.3] bg-white/[0.15] text-white"
                : "border-white/[0.08] bg-white/[0.045] text-white/[0.55] hover:bg-white/[0.09]"
            }`}
            type="button"
            aria-pressed={settings.localSuggestionsEnabled}
            onClick={() => onChange((current) => ({ ...current, localSuggestionsEnabled: !current.localSuggestionsEnabled }))}
          >
            <span>{language === "en" ? "Nearby ideas" : "Ideer i nærheten"}</span>
            <span className="font-semibold">{settings.localSuggestionsEnabled ? (language === "en" ? "On" : "På") : language === "en" ? "Off" : "Av"}</span>
          </button>
        </section>
      </div>
    </aside>
  );
}

function LocalSuggestionLine({
  data,
  enabled,
  error,
  isLoading,
  language,
}: {
  data: LocalSuggestionsApiResponse | null;
  enabled: boolean;
  error: string;
  isLoading: boolean;
  language: SupportedLanguage;
}) {
  if (!enabled) return null;

  if (isLoading) {
    return (
      <p className="mt-5 text-sm leading-6 text-white/[0.56]">
        <span className="font-semibold text-white/[0.66]">{language === "en" ? "Nearby:" : "I nærheten:"}</span>{" "}
        {language === "en" ? "finding a calm idea." : "finner en rolig idé."}
      </p>
    );
  }

  if (error) return null;

  const suggestionTitles = (data?.suggestions || []).map((suggestion) => suggestion.title.trim()).filter(Boolean).slice(0, 2);
  if (!suggestionTitles.length) return null;

  return (
    <p className="mt-5 max-w-xl text-sm leading-6 text-white/[0.58]">
      <span className="font-semibold text-white/[0.68]">{language === "en" ? "Nearby:" : "I nærheten:"}</span>{" "}
      {suggestionTitles.join(" · ")}
    </p>
  );
}

function RhythmDrawerToggle({ isOpen, language, onToggle }: { isOpen: boolean; language: SupportedLanguage; onToggle: () => void }) {
  return (
    <button
      className={`fixed right-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/[0.14] bg-black/[0.18] text-xl font-semibold leading-none text-white/[0.78] shadow-2xl shadow-black/20 backdrop-blur-2xl transition hover:bg-white/[0.12] hover:text-white ${
        isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      type="button"
      aria-label={language === "en" ? "Open rhythm panel" : "Åpne rytmepanel"}
      title={language === "en" ? "Rhythm" : "Rytme"}
      onClick={onToggle}
    >
      <span className="text-lg leading-none" aria-hidden="true">&lt;</span>
    </button>
  );
}

function RhythmDrawer({
  activeSection,
  anchors,
  calendar,
  hasProfile,
  isOpen,
  isSetupOpen,
  language,
  nudges,
  onClose,
  onEdit,
  onSave,
  onSetupCancel,
  plan,
  profile,
}: {
  activeSection: SectionTitle;
  anchors: RhythmAnchor[];
  calendar: RhythmCalendarContext;
  hasProfile: boolean;
  isOpen: boolean;
  isSetupOpen: boolean;
  language: SupportedLanguage;
  nudges: RhythmNudge[];
  onClose: () => void;
  onEdit: () => void;
  onSave: (values: RhythmProfileInput) => void;
  onSetupCancel?: () => void;
  plan: RhythmPlan;
  profile: RhythmProfile | null;
}) {
  if (!isOpen) return null;

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-30 w-[min(32rem,calc(100vw-1rem))] overflow-y-auto border-l border-white/[0.14] bg-black/[0.2] px-5 py-5 text-white shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.48]">Zen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">{language === "en" ? "Rhythm" : "Rytme"}</h2>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] bg-white/[0.08] text-2xl leading-none text-white/[0.74] transition hover:bg-white/[0.14] hover:text-white"
          type="button"
          aria-label={language === "en" ? "Close rhythm panel" : "Lukk rytmepanel"}
          onClick={onClose}
        >
          &gt;
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {isSetupOpen ? (
          <RhythmSetupPanel language={language} profile={profile} onCancel={onSetupCancel} onSave={onSave} />
        ) : (
          <RhythmPlanCard
            activeSection={activeSection}
            anchors={anchors}
            calendar={calendar}
            hasProfile={hasProfile}
            language={language}
            nudges={nudges}
            plan={plan}
            onEdit={onEdit}
          />
        )}
      </div>
    </aside>
  );
}

function RhythmPlanCard({
  activeSection,
  anchors,
  calendar,
  nudges,
  language,
  plan,
  hasProfile,
  onEdit,
}: {
  activeSection: SectionTitle;
  anchors: RhythmAnchor[];
  calendar: RhythmCalendarContext;
  nudges: RhythmNudge[];
  language: SupportedLanguage;
  plan: RhythmPlan;
  hasProfile: boolean;
  onEdit: () => void;
}) {
  const activeAnchor = anchors.find((anchor) => anchor.phase === activeSection) || anchors[0];
  const activeNudge = nudges.find((nudge) => nudge.phase === activeSection) || nudges[0];
  const guide = getRhythmGuideCopy(plan, calendar, hasProfile, language);

  return (
    <section className="space-y-4">
      <div className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.09] px-5 py-5 shadow-2xl shadow-black/10 backdrop-blur-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.5]">{guide.nowLabel}</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-white">{guide.nowTitle}</h3>
        <p className="mt-4 text-base leading-7 text-white/[0.72]">{guide.nowText}</p>
        <p className="mt-4 rounded-2xl border border-white/[0.08] bg-black/[0.08] px-4 py-3 text-sm leading-6 text-white/[0.56]">
          {guide.currentPicture}
        </p>
        {!hasProfile ? <p className="mt-3 text-sm leading-6 text-white/[0.48]">{guide.empty}</p> : null}
      </div>

      <div className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.08] px-5 py-5 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.5]">{guide.anchorLabel}</p>
          <span className="rounded-full bg-white/[0.11] px-3 py-1 text-xs font-semibold text-white/[0.58]">
            {getSectionTitleLabel(activeAnchor.phase, language)}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-semibold leading-tight text-white">{activeAnchor.title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/[0.62]">{activeAnchor.text}</p>
        <p className="mt-4 rounded-2xl bg-white/[0.09] px-4 py-3 text-sm font-semibold leading-6 text-white/[0.8]">
          {activeAnchor.action}
        </p>
        {activeNudge ? (
          <p className="mt-3 text-sm leading-6 text-white/[0.56]">
            <span className="font-semibold text-white/[0.72]">{guide.smallStepLabel}:</span> {activeNudge.microStep}
          </p>
        ) : null}
      </div>

      <div className="rounded-[1.4rem] border border-white/[0.1] bg-black/[0.08] px-5 py-5 backdrop-blur-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.5]">{guide.adjustLabel}</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-white">{guide.adjustTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-white/[0.58]">{guide.adjustText}</p>
        <button
          className="mt-4 rounded-full border border-white/[0.14] bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/[0.74] transition hover:bg-white/[0.14] hover:text-white"
          type="button"
          onClick={onEdit}
        >
          {guide.adjustButton}
        </button>

        <details className="mt-5 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-white/[0.58]">
          <summary className="cursor-pointer select-none font-semibold text-white/[0.72]">{guide.detailsLabel}</summary>
          <div className="mt-4 grid gap-3">
            <div className="border-t border-white/[0.08] pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/[0.38]">{guide.registeredLabel}</p>
              <p className="mt-1 text-lg font-semibold text-white/[0.86]">{plan.currentWindowLabel}</p>
              <p className="mt-1 text-xs leading-5 text-white/[0.44]">{guide.registeredHint}</p>
            </div>
            <div className="border-t border-white/[0.08] pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/[0.38]">{guide.directionLabel}</p>
              <p className="mt-1 text-lg font-semibold text-white/[0.86]">{plan.targetWindowLabel}</p>
              <p className="mt-1 text-xs leading-5 text-white/[0.44]">{guide.directionHint}</p>
            </div>
            <div className="border-t border-white/[0.08] pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/[0.38]">{guide.firstStepLabel}</p>
              <p className="mt-1 text-lg font-semibold text-white/[0.86]">{plan.nextBedtimeLabel}</p>
              <p className="mt-1 text-xs leading-5 text-white/[0.44]">{guide.wakeLine}</p>
            </div>
            <div className="grid gap-3 border-t border-white/[0.08] pt-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/[0.38]">{guide.weekdayLabel}</p>
                <p className="mt-1 font-semibold text-white/[0.78]">{plan.weekdayWindowLabel}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/[0.38]">{guide.freeLabel}</p>
                <p className="mt-1 font-semibold text-white/[0.78]">{plan.weekendWindowLabel}</p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function getRhythmGuideCopy(plan: RhythmPlan, calendar: RhythmCalendarContext, hasProfile: boolean, language: SupportedLanguage) {
  const freeDay = calendar.tone === "free_day";
  const weekend = calendar.tone === "weekend";
  const shifted = plan.rhythmState === "delayed" || plan.isCircadianDrifted;
  const variable = plan.rhythmState === "social_jetlag" || plan.rhythmFeeling === "weekday_weekend_diff";
  const lowSignal = plan.rhythmState === "unstable" || plan.rhythmFeeling === "tired_all_day";

  if (language === "en") {
    const nowTitle = freeDay
      ? "A free day can stay soft."
      : weekend
        ? "The rhythm can be looser today."
        : shifted
          ? "The rhythm is running late right now."
          : variable
            ? "Workdays and free days pull differently."
            : lowSignal
              ? "The rhythm needs steady signals first."
              : "The rhythm has a calmer starting point.";

    const nowText = freeDay
      ? "No need to make the day strict. One small anchor is enough to keep some direction."
      : weekend
        ? "Keep a little freedom, and give the body one thing it can recognize."
        : shifted
          ? "Zen will not move everything at once. One clear signal at a time is enough."
          : variable
            ? "The goal is a softer transition, not a stricter weekend."
            : lowSignal
              ? "Light, calm timing, and one small step matter more than a perfect plan."
              : "Keep it simple and repeatable, without turning the day into a schedule.";

    return {
      nowLabel: "Right now",
      nowTitle,
      nowText,
      currentPicture: hasProfile ? "This is the current picture of your rhythm, not a goal." : "Zen is using a calm default until you add your own rhythm.",
      empty: "Add your own rhythm when you want Zen to guide from your real day.",
      anchorLabel: "Today's rhythm anchor",
      smallStepLabel: "Small step",
      adjustLabel: "Adjust rhythm",
      adjustTitle: hasProfile ? "Change the rhythm when it no longer fits." : "Add your rhythm when you are ready.",
      adjustText: "You can update how the rhythm feels and the times Zen uses as context.",
      adjustButton: hasProfile ? "Adjust rhythm" : "Add rhythm",
      detailsLabel: "Show rhythm details",
      registeredLabel: "Registered now",
      registeredHint: "This is what you entered, not what Zen recommends as a final rhythm.",
      directionLabel: "Soft direction",
      directionHint: "Zen moves in small steps, not large jumps.",
      firstStepLabel: "First small shift",
      wakeLine: plan.isCircadianDrifted ? "Wake time moves gently earlier over time." : `Wake around ${plan.nextWakeLabel}.`,
      weekdayLabel: "Weekday",
      freeLabel: "Weekend/free",
    };
  }

  const nowTitle = freeDay
    ? "Fridagen kan være myk."
    : weekend
      ? "Rytmen kan være friere i dag."
      : shifted
        ? "Rytmen ligger sent akkurat nå."
        : variable
          ? "Hverdag og fri trekker ulikt."
          : lowSignal
            ? "Rytmen trenger stabile signaler først."
            : "Rytmen har et roligere utgangspunkt.";

  const nowText = freeDay
    ? "Dagen trenger ikke bli streng. Ett lite anker er nok til å holde litt retning."
    : weekend
      ? "Behold litt frihet, og gi kroppen én ting den kan kjenne igjen."
      : shifted
        ? "Zen flytter ikke alt på én gang. Ett tydelig signal om gangen er nok."
        : variable
          ? "Målet er en mykere overgang, ikke en strengere helg."
          : lowSignal
            ? "Lys, rolig timing og ett lite steg betyr mer enn en perfekt plan."
            : "Hold det enkelt og gjentakbart, uten at dagen blir en timeplan.";

  return {
    nowLabel: "Akkurat nå",
    nowTitle,
    nowText,
    currentPicture: hasProfile ? "Dette er slik rytmen ser ut nå, ikke et mål." : "Zen bruker en rolig standardrytme til du legger inn din egen.",
    empty: "Legg inn din egen rytme når du vil at Zen skal guide fra din faktiske dag.",
    anchorLabel: "Dagens rytmeanker",
    smallStepLabel: "Lite steg",
    adjustLabel: "Juster rytmen",
    adjustTitle: hasProfile ? "Endre rytmen når den ikke lenger passer." : "Legg inn rytmen når du er klar.",
    adjustText: "Du kan oppdatere hvordan rytmen føles og tidene Zen bruker som kontekst.",
    adjustButton: hasProfile ? "Juster rytme" : "Legg inn rytme",
    detailsLabel: "Vis rytmedetaljer",
    registeredLabel: "Registrert nå",
    registeredHint: "Dette er det du har lagt inn, ikke det Zen anbefaler som endelig rytme.",
    directionLabel: "Myk retning",
    directionHint: "Zen flytter i små steg, ikke store hopp.",
    firstStepLabel: "Første lille justering",
    wakeLine: plan.isCircadianDrifted ? "Våkning flyttes rolig tidligere over tid." : `Våkne rundt ${plan.nextWakeLabel}.`,
    weekdayLabel: "Ukedag",
    freeLabel: "Helg/fri",
  };
}

function RhythmSetupPanel({
  language,
  profile,
  onCancel,
  onSave,
}: {
  language: SupportedLanguage;
  profile: RhythmProfile | null;
  onCancel?: () => void;
  onSave: (values: RhythmProfileInput) => void;
}) {
  const copy =
    language === "en"
      ? {
          title: "Rhythm",
          heading: "Let Zen meet the rhythm where it is.",
          cancel: "Cancel",
          feelingQuestion: "How does the rhythm feel now?",
          usualBedtime: "Usually sleep",
          usualWake: "Usually wake",
          desiredWake: "Want to wake",
          weekdayWeekend: "Weekday and free days",
          weekdaySleep: "Weekday sleep",
          weekdayWake: "Weekday wake",
          freeSleep: "Free day sleep",
          freeWake: "Free day wake",
          error: "Choose valid times first.",
          save: "Save rhythm",
        }
      : {
          title: "Døgnrytme",
          heading: "La Zen møte rytmen din der den er.",
          cancel: "Avbryt",
          feelingQuestion: "Hvordan føles rytmen nå?",
          usualBedtime: "Legger meg vanligvis",
          usualWake: "Våkner vanligvis",
          desiredWake: "Ønsker å våkne",
          weekdayWeekend: "Ukedag og fri",
          weekdaySleep: "Ukedag ned",
          weekdayWake: "Ukedag opp",
          freeSleep: "Fri ned",
          freeWake: "Fri opp",
          error: "Velg gyldige klokkeslett først.",
          save: "Lagre rytme",
        };
  const [rhythmFeeling, setRhythmFeeling] = useState<RhythmProfile["rhythmFeeling"]>(profile?.rhythmFeeling || "unstable");
  const [usualBedtime, setUsualBedtime] = useState(profile?.usualBedtime || "23:30");
  const [usualWake, setUsualWake] = useState(profile?.usualWake || "07:30");
  const [desiredWake, setDesiredWake] = useState(profile?.desiredWake || "07:00");
  const [weekdaySleepTime, setWeekdaySleepTime] = useState(profile?.weekdaySleepTime || profile?.usualBedtime || "23:30");
  const [weekdayWakeTime, setWeekdayWakeTime] = useState(profile?.weekdayWakeTime || profile?.usualWake || "07:30");
  const [weekendSleepTime, setWeekendSleepTime] = useState(profile?.weekendSleepTime || profile?.usualBedtime || "00:30");
  const [weekendWakeTime, setWeekendWakeTime] = useState(profile?.weekendWakeTime || profile?.usualWake || "08:30");
  const [error, setError] = useState("");

  function submit() {
    if (![usualBedtime, usualWake, desiredWake, weekdaySleepTime, weekdayWakeTime, weekendSleepTime, weekendWakeTime].every(isValidClockTime)) {
      setError(copy.error);
      return;
    }

    setError("");
    onSave({ rhythmFeeling, usualBedtime, usualWake, desiredWake, weekdaySleepTime, weekdayWakeTime, weekendSleepTime, weekendWakeTime });
  }

  return (
    <section className="rounded-[1.4rem] border border-white/[0.14] bg-white/[0.11] px-5 py-5 shadow-2xl shadow-black/15 backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/[0.5]">{copy.title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal text-white">{copy.heading}</h3>
        </div>
        {onCancel ? (
          <button
            className="rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/[0.66] transition hover:bg-white/[0.12] hover:text-white"
            type="button"
            onClick={onCancel}
          >
            {copy.cancel}
          </button>
        ) : null}
      </div>

      <div className="mt-6 border-t border-white/[0.1] pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.42]">{copy.feelingQuestion}</p>
        <div className="mt-3 grid gap-2">
          {RHYTHM_FEELING_OPTIONS.map((option) => {
            const active = rhythmFeeling === option.value;
            const optionCopy = getRhythmFeelingOptionCopy(option.value, language);
            return (
              <button
                key={option.value}
                className={`rounded-[1.1rem] border px-4 py-3 text-left transition ${
                  active ? "border-white/[0.34] bg-white/[0.16] text-white" : "border-white/[0.09] bg-white/[0.055] text-white/[0.68] hover:bg-white/[0.1] hover:text-white"
                }`}
                type="button"
                onClick={() => setRhythmFeeling(option.value)}
              >
                <span className="block text-sm font-semibold">{optionCopy.title}</span>
                <span className="mt-1 block text-xs leading-5 text-white/[0.48]">{optionCopy.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-white/[0.1] pt-4 sm:grid-cols-2">
        <label className="block border-t border-white/[0.1] pt-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.42]">{copy.usualBedtime}</span>
          <input
            className="mt-3 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
            type="time"
            value={usualBedtime}
            onChange={(event) => setUsualBedtime(event.target.value)}
          />
        </label>
        <label className="block border-t border-white/[0.1] pt-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.42]">{copy.usualWake}</span>
          <input
            className="mt-3 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
            type="time"
            value={usualWake}
            onChange={(event) => setUsualWake(event.target.value)}
          />
        </label>
        <label className="block border-t border-white/[0.1] pt-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.42]">{copy.desiredWake}</span>
          <input
            className="mt-3 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
            type="time"
            value={desiredWake}
            onChange={(event) => setDesiredWake(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 border-t border-white/[0.1] pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.42]">{copy.weekdayWeekend}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">{copy.weekdaySleep}</span>
            <input
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
              type="time"
              value={weekdaySleepTime}
              onChange={(event) => setWeekdaySleepTime(event.target.value)}
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">{copy.weekdayWake}</span>
            <input
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
              type="time"
              value={weekdayWakeTime}
              onChange={(event) => setWeekdayWakeTime(event.target.value)}
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">{copy.freeSleep}</span>
            <input
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
              type="time"
              value={weekendSleepTime}
              onChange={(event) => setWeekendSleepTime(event.target.value)}
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">{copy.freeWake}</span>
            <input
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/[0.14] bg-black/[0.12] px-3 py-3 text-base font-semibold leading-tight text-white outline-none focus:border-white/[0.34]"
              type="time"
              value={weekendWakeTime}
              onChange={(event) => setWeekendWakeTime(event.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-100">{error}</p> : null}

      <button className="mt-5 w-full rounded-2xl bg-white/[0.18] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.24]" type="button" onClick={submit}>
        {copy.save}
      </button>
    </section>
  );
}

function getRhythmFeelingOptionCopy(value: RhythmProfile["rhythmFeeling"], language: SupportedLanguage) {
  const copy: Record<RhythmProfile["rhythmFeeling"], Record<SupportedLanguage, { title: string; description: string }>> = {
    best_early: {
      no: { title: "Jeg fungerer best tidlig", description: "Zen holder starten myk, men tydelig." },
      en: { title: "I feel best earlier", description: "Zen keeps the start soft, but clear." },
    },
    best_later: {
      no: { title: "Jeg fungerer best senere", description: "Zen møter rytmen senere uten å presse." },
      en: { title: "I feel best later", description: "Zen meets the later rhythm without pressure." },
    },
    tired_all_day: {
      no: { title: "Jeg er trøtt nesten uansett", description: "Zen starter med små signaler, ikke store krav." },
      en: { title: "I feel tired most of the time", description: "Zen starts with small signals, not big demands." },
    },
    unstable: {
      no: { title: "Rytmen føles ustabil", description: "Zen stabiliserer før den tolker." },
      en: { title: "My rhythm feels unsettled", description: "Zen stabilizes before interpreting." },
    },
    weekday_weekend_diff: {
      no: { title: "Hverdag og fri er ulike", description: "Zen demper forskjellen uten å gjøre fridager strenge." },
      en: { title: "Workdays and free days differ", description: "Zen softens the difference without making free days strict." },
    },
  };

  return copy[value][language];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTestDateTime(now: Date, dateOverride: string) {
  if (!dateOverride) return now;

  const [year, month, day] = dateOverride.split("-").map(Number);
  if (!year || !month || !day) return now;

  const nextDate = new Date(now);
  nextDate.setFullYear(year, month - 1, day);
  return nextDate;
}

function inferDayType(date: Date, isHoliday: boolean, workDays: number[]): DayType {
  if (isHoliday) return "free_day";
  const day = date.getDay();
  if (!workDays.includes(day)) return day === 0 || day === 6 ? "weekend" : "free_day";
  return "weekday";
}

function DevTestPanel({
  activeSample,
  activeSection,
  aiTextEnabled,
  backendStatus,
  backendStatusError,
  dayType,
  dayTypeOverride,
  holidayOverride,
  isOpen,
  language,
  localSuggestions,
  localSuggestionsEnabled,
  localSuggestionsError,
  testDate,
  weatherError,
  zenText,
  zenTextError,
  zenTextLoading,
  onClose,
  onOpenRhythm,
  onOpenSettings,
  onOpenSmallStep,
  onReset,
  onResetAll,
  onSelectDayType,
  onSelectDate,
  onSelectLanguage,
  onSelectSection,
  onSelect,
  onToggle,
  onToggleHoliday,
  onToggleLocalSuggestions,
  settings,
}: {
  activeSample: string;
  activeSection: SectionTitle | null;
  aiTextEnabled: boolean;
  backendStatus: BackendStatusResponse | null;
  backendStatusError: string;
  dayType: DayType;
  dayTypeOverride: DayType | null;
  holidayOverride: HolidayInfo | null;
  isOpen: boolean;
  language: SupportedLanguage;
  localSuggestions: LocalSuggestionsApiResponse | null;
  localSuggestionsEnabled: boolean;
  localSuggestionsError: string;
  weatherError: string;
  zenText: ZenTextApiResponse | null;
  zenTextError: string;
  zenTextLoading: boolean;
  onClose: () => void;
  onOpenRhythm: () => void;
  onOpenSettings: () => void;
  onOpenSmallStep: () => void;
  onReset: () => void;
  onResetAll: () => void;
  onSelectDayType: (dayType: DayType | "auto") => void;
  onSelectDate: (date: string) => void;
  onSelectLanguage: (language: SupportedLanguage | "auto") => void;
  onSelectSection: (sectionTitle: SectionTitle | null) => void;
  onSelect: (sample: (typeof weatherSamples)[number]) => void;
  onToggle: () => void;
  onToggleHoliday: () => void;
  onToggleLocalSuggestions: () => void;
  settings: AppSettings;
  testDate: string;
}) {
  const copy = {
    title: language === "en" ? "DEV test panel" : "DEV testpanel",
    subtitle: language === "en" ? "Try rhythm, weather, language, and panels quickly." : "Prøv rytme, vær, språk og paneler raskt.",
    close: language === "en" ? "Close" : "Lukk",
    time: language === "en" ? "Phase" : "Fase",
    date: language === "en" ? "Date" : "Dato",
    dateHint: language === "en" ? "Overrides today for holiday and phase testing." : "Overstyrer dagens dato for helligdag og fasetesting.",
    weather: language === "en" ? "Weather" : "Vær",
    language: language === "en" ? "Language" : "Språk",
    dayType: language === "en" ? "Day type" : "Dagtype",
    panels: language === "en" ? "Panels" : "Paneler",
    status: language === "en" ? "Backend status" : "Backend-status",
    liveWeather: language === "en" ? "Live weather/time" : "Live vær/tid",
    resetAll: language === "en" ? "Reset test state" : "Nullstill test",
    settings: language === "en" ? "Settings" : "Innstillinger",
    rhythm: language === "en" ? "Rhythm" : "Rytme",
    smallStep: language === "en" ? "Small step" : "Lite steg",
    local: language === "en" ? "Local ideas" : "Lokale ideer",
    aiText: language === "en" ? "AI text" : "KI-tekst",
    testHoliday: language === "en" ? "Test free day" : "Testfridag",
  };

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-5 left-5 z-20 rounded-full border border-white/[0.14] bg-black/[0.18] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/[0.72] shadow-2xl shadow-black/20 backdrop-blur-2xl transition hover:bg-white/[0.12] hover:text-white"
        type="button"
        aria-label={copy.title}
        onClick={onToggle}
      >
        Test
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-30 max-h-[calc(100svh-1.5rem)] overflow-y-auto rounded-[1.5rem] border border-white/[0.14] bg-black/[0.28] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:bottom-5 sm:left-5 sm:right-auto sm:w-[min(38rem,calc(100vw-2.5rem))]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.58]">{copy.title}</p>
          <p className="mt-1 text-sm text-white/[0.68]">{copy.subtitle}</p>
        </div>
        <button className="rounded-full bg-white/[0.1] px-3 py-2 text-sm text-white/[0.74] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onClose}>
          {copy.close}
        </button>
      </div>

      <section className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.055] px-3 py-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.status}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusPill
            label={language === "en" ? "Backend" : "Backend"}
            value={backendStatus?.ok ? "ok" : backendStatusError ? "error" : "wait"}
            detail={backendStatusError || (backendStatus?.ok ? "ok" : "...")}
            language={language}
          />
          <StatusPill
            label={language === "en" ? "Weather" : "Vær"}
            value={weatherError ? "error" : "ok"}
            detail={weatherError ? (language === "en" ? "fallback" : "reserve") : "ok"}
            language={language}
          />
          <StatusPill
            label={copy.local}
            value={!localSuggestionsEnabled ? "off" : localSuggestionsError ? "error" : localSuggestions ? "ok" : "wait"}
            detail={!localSuggestionsEnabled ? "off" : localSuggestions?.source || localSuggestionsError || "..."}
            language={language}
          />
          <StatusPill
            label={copy.aiText}
            value={!aiTextEnabled ? "off" : zenTextError ? "error" : zenText ? "ok" : zenTextLoading ? "wait" : "wait"}
            detail={!aiTextEnabled ? "off" : zenText?.source || zenTextError || "..."}
            language={language}
          />
        </div>
        {backendStatus?.services.gemini.configured ? (
          <p className="mt-2 text-xs text-white/[0.42]">{backendStatus.services.gemini.model}</p>
        ) : (
          <p className="mt-2 text-xs text-white/[0.42]">
            {language === "en" ? "Gemini key is not visible to frontend; status only says whether backend has one." : "Gemini-nøkkelen vises ikke i frontend; status sier bare om backend har en."}
          </p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.time}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {timeSamples.map((sample) => {
              const active = activeSection === sample.sectionTitle;
              return (
                <button
                  key={sample.label}
                  className={`min-h-[3rem] rounded-2xl border px-2 py-3 text-center text-xs font-semibold leading-tight transition ${
                    active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
                  }`}
                  type="button"
                  onClick={() => onSelectSection(sample.sectionTitle)}
                >
                  {sample.sectionTitle ? getSectionTitleLabel(sample.sectionTitle, language) : "Live"}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.date}</p>
          <input
            className="h-[3.35rem] w-full rounded-2xl border border-white/[0.12] bg-white/[0.07] px-3 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-white/[0.34]"
            type="date"
            value={testDate}
            onChange={(event) => onSelectDate(event.target.value)}
          />
          <p className="mt-2 text-xs leading-5 text-white/[0.46]">{copy.dateHint}</p>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.language}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Auto", value: "auto" as const, active: settings.languageSource !== "manual" },
              { label: "Norsk", value: "no" as const, active: settings.languageSource === "manual" && settings.language === "no" },
              { label: "English", value: "en" as const, active: settings.languageSource === "manual" && settings.language === "en" },
            ].map((option) => (
              <button
                key={option.value}
                className={`min-h-[3rem] rounded-2xl border px-2 py-3 text-center text-xs font-semibold leading-tight transition ${
                  option.active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
                }`}
                type="button"
                onClick={() => onSelectLanguage(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.dayType}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["auto", "weekday", "weekend", "free_day"] as const).map((option) => {
              const active = option === "auto" ? !dayTypeOverride : dayTypeOverride === option;
              return (
                <button
                  key={option}
                  className={`min-h-[3rem] rounded-2xl border px-2 py-3 text-center text-xs font-semibold leading-tight transition ${
                    active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
                  }`}
                  type="button"
                  onClick={() => onSelectDayType(option)}
                >
                  {getDayTypeLabel(option, language)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-white/[0.46]">{getDayTypeLabel(dayType, language)}</p>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.panels}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: copy.settings, onClick: onOpenSettings },
              { label: copy.rhythm, onClick: onOpenRhythm },
              { label: copy.smallStep, onClick: onOpenSmallStep },
              { label: copy.local, onClick: onToggleLocalSuggestions, active: localSuggestionsEnabled },
            ].map((option) => (
              <button
                key={option.label}
                className={`min-h-[3rem] rounded-2xl border px-2 py-3 text-center text-xs font-semibold leading-tight transition ${
                  option.active
                    ? "border-white/[0.38] bg-white/[0.18] text-white"
                    : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12] hover:text-white"
                }`}
                type="button"
                onClick={option.onClick}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">{copy.weather}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {weatherSamples.map((sample) => {
          const active = activeSample === sample.symbolCode;
          return (
            <button
              key={sample.symbolCode}
              className={`min-w-0 rounded-2xl border px-3 py-3 text-left text-sm leading-tight transition ${
                active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
              }`}
              type="button"
              onClick={() => onSelect(sample)}
            >
              <span className="block font-semibold">{sample.labels[language]}</span>
              <span className="mt-1 block text-xs text-white/[0.54]">{sample.symbolCode}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button className="min-h-[3rem] rounded-2xl bg-white/[0.1] px-4 py-3 text-sm font-semibold leading-tight text-white/[0.75] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onReset}>
          {copy.liveWeather}
        </button>
        <button
          className={`min-h-[3rem] rounded-2xl border px-4 py-3 text-sm font-semibold leading-tight transition ${
            holidayOverride ? "border-rose-200/40 bg-rose-200/20 text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
          }`}
          type="button"
          onClick={onToggleHoliday}
        >
          {copy.testHoliday}
        </button>
        <button className="min-h-[3rem] rounded-2xl bg-white/[0.1] px-4 py-3 text-sm font-semibold leading-tight text-white/[0.75] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onResetAll}>
          {copy.resetAll}
        </button>
      </div>
    </div>
  );
}

function StatusPill({
  detail,
  label,
  language,
  value,
}: {
  detail: string;
  label: string;
  language: SupportedLanguage;
  value: "ok" | "error" | "wait" | "off";
}) {
  const styles = {
    ok: "border-emerald-200/20 bg-emerald-200/12 text-emerald-50",
    error: "border-amber-200/24 bg-amber-200/12 text-amber-50",
    wait: "border-white/[0.12] bg-white/[0.06] text-white/[0.68]",
    off: "border-white/[0.08] bg-black/[0.08] text-white/[0.42]",
  };
  const text = {
    ok: language === "en" ? "ok" : "ok",
    error: language === "en" ? "check" : "sjekk",
    wait: "...",
    off: language === "en" ? "off" : "av",
  };

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${styles[value]}`}>
      <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold">{text[value]} · {detail}</p>
    </div>
  );
}

function SmallStepPanel({
  isOpen,
  onAdd,
  onClose,
}: {
  isOpen: boolean;
  onAdd: (text: string, scope: SmallStep["scope"]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<SmallStep["scope"]>("today");

  function submit() {
    if (!text.trim()) return;
    onAdd(text, scope);
    setText("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-30 w-[min(24rem,calc(100vw-2.5rem))] rounded-[1.5rem] border border-white/[0.14] bg-black/[0.26] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.58]">Lite steg</p>
          <p className="mt-1 text-sm text-white/[0.68]">Legg inn noe kort. Zen finner et rolig sted.</p>
        </div>
        <button className="rounded-full bg-white/[0.1] px-3 py-2 text-sm text-white/[0.74] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onClose}>
          Lukk
        </button>
      </div>

      <input
        className="mt-4 w-full rounded-2xl border border-white/[0.12] bg-white/[0.09] px-4 py-3 text-base text-white outline-none placeholder:text-white/[0.38] focus:border-white/[0.28]"
        maxLength={48}
        placeholder="re opp senga"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "I dag", value: "today" as const },
          { label: "Innen 7 dager", value: "week" as const },
        ].map((option) => (
          <button
            key={option.value}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              scope === option.value ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.7] hover:bg-white/[0.12]"
            }`}
            type="button"
            onClick={() => setScope(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button className="mt-3 w-full rounded-2xl bg-white/[0.16] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.22]" type="button" onClick={submit}>
        Legg til
      </button>
    </div>
  );
}

function loadSmallSteps(): SmallStep[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(SMALL_STEPS_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizeSmallStep).filter((step): step is SmallStep => Boolean(step));
  } catch {
    return [];
  }
}

function normalizeSmallStep(value: unknown): SmallStep | null {
  const maybe = value as SmallStep;
  const sectionTitle = normalizeSectionTitle(maybe?.sectionTitle);
  if (
    typeof maybe?.id === "string" &&
    typeof maybe?.text === "string" &&
    (maybe?.scope === "today" || maybe?.scope === "week") &&
    sectionTitle &&
    typeof maybe?.createdAt === "string" &&
    typeof maybe?.done === "boolean"
  ) {
    return { ...maybe, sectionTitle };
  }

  return null;
}

function loadRhythmProfile(): RhythmProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(RHYTHM_PROFILE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<RhythmProfile>;
    if (
      typeof parsed.usualBedtime === "string" &&
      typeof parsed.usualWake === "string" &&
      typeof parsed.desiredWake === "string" &&
      isValidClockTime(parsed.usualBedtime) &&
      isValidClockTime(parsed.usualWake) &&
      isValidClockTime(parsed.desiredWake)
    ) {
      const rhythmFeeling: RhythmProfile["rhythmFeeling"] = RHYTHM_FEELING_OPTIONS.some((option) => option.value === parsed.rhythmFeeling)
        ? (parsed.rhythmFeeling as RhythmProfile["rhythmFeeling"])
        : "unstable";
      const profileSignals = getProfileSignalsFromFeeling(rhythmFeeling);
      const getSavedTime = (value: unknown, fallback: string) => (typeof value === "string" && isValidClockTime(value) ? value : fallback);
      const weekdaySleepTime = getSavedTime(parsed.weekdaySleepTime, parsed.usualBedtime);
      const weekdayWakeTime = getSavedTime(parsed.weekdayWakeTime, parsed.usualWake);
      const weekendSleepTime = getSavedTime(parsed.weekendSleepTime, parsed.usualBedtime);
      const weekendWakeTime = getSavedTime(parsed.weekendWakeTime, parsed.usualWake);

      return {
        ...profileSignals,
        rhythmFeeling,
        usualBedtime: parsed.usualBedtime,
        usualWake: parsed.usualWake,
        desiredWake: parsed.desiredWake,
        weekdaySleepTime,
        weekdayWakeTime,
        weekendSleepTime,
        weekendWakeTime,
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    }
  } catch {
    return null;
  }

  return null;
}

function placeSmallStep(text: string, fallback: SectionTitle): SectionTitle {
  const normalized = text.toLowerCase();

  if (matchesAny(normalized, ["re opp", "frokost", "morgen", "kaffe", "dusj", "trening", "gå tur", "lys", "stå opp"])) return "Morgen";
  if (matchesAny(normalized, ["jobb", "mail", "e-post", "epost", "møte", "rapport", "søknad", "ringe", "send", "fokus"])) return "Dag";
  if (matchesAny(normalized, ["pause", "reset", "puste", "vann", "strekke", "luft"])) return "Ettermiddag";
  if (matchesAny(normalized, ["rydde", "vaske", "kjøkken", "middag", "handle", "søppel", "klesvask", "mat", "demp"])) return "Kveld";
  if (matchesAny(normalized, ["seng", "senga", "lese", "sove", "meditere", "journal", "bok", "legge meg", "skjerm"])) return "Natt";

  return fallback;
}

function matchesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function isExpiredSmallStep(step: SmallStep) {
  const created = new Date(step.createdAt).getTime();
  if (!Number.isFinite(created)) return false;

  const maxAge = step.scope === "today" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return Date.now() - created > maxAge;
}

function getSectionIcon(sectionTitle: SectionTitle, dayType: DayType = "weekday") {
  if (sectionTitle === "Dag" && dayType !== "weekday") return "sun";

  const map: Record<SectionTitle, WeatherIcon> = {
    Morgen: "sunrise",
    Dag: "briefcase",
    Ettermiddag: "cloud",
    Kveld: "evening",
    Natt: "moon",
  };

  return map[sectionTitle];
}

function getWeatherIcon(symbolCode: string, sectionTitle: SectionTitle): WeatherIcon {
  const code = symbolCode.toLowerCase();

  if (code.includes("thunder")) return "storm";
  if (code.includes("snow")) return "snow";
  if (code.includes("sleet") || code.includes("rain")) return "rain";
  if (code.includes("fog")) return "fog";
  if (code.includes("cloudy") || code.includes("fair")) return "cloud";
  if (sectionTitle === "Natt") return "moon";
  return "sun";
}

type WeatherIcon = "sun" | "sunrise" | "cloud" | "rain" | "snow" | "fog" | "storm" | "moon" | "evening" | "briefcase";

function WeatherGlyph({ icon, className }: { icon: WeatherIcon; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (icon === "cloud") {
    return (
      <svg {...common}>
        <path d="M7 18h10.2a4 4 0 0 0 .6-7.95 6.2 6.2 0 0 0-11.9 1.7A3.2 3.2 0 0 0 7 18Z" fill="currentColor" opacity="0.9" stroke="none" />
      </svg>
    );
  }

  if (icon === "rain") {
    return (
      <svg {...common}>
        <path d="M7 14.5h10.2a3.6 3.6 0 0 0 .45-7.17A5.6 5.6 0 0 0 6.9 8.7 3 3 0 0 0 7 14.5Z" fill="currentColor" opacity="0.72" stroke="none" />
        <path d="M8.5 18.5 7.8 20" />
        <path d="M12.2 18.5 11.5 20" />
        <path d="M15.9 18.5 15.2 20" />
      </svg>
    );
  }

  if (icon === "snow") {
    return (
      <svg {...common}>
        <path d="M12 4v16" />
        <path d="M5.1 8 18.9 16" />
        <path d="M18.9 8 5.1 16" />
        <path d="m9.5 5.6 2.5 2.5 2.5-2.5" />
        <path d="m9.5 18.4 2.5-2.5 2.5 2.5" />
      </svg>
    );
  }

  if (icon === "fog") {
    return (
      <svg {...common}>
        <path d="M5 9h14" />
        <path d="M3.8 13h16.4" />
        <path d="M6 17h12" />
      </svg>
    );
  }

  if (icon === "storm") {
    return (
      <svg {...common}>
        <path d="M7 13h10.2a3.6 3.6 0 0 0 .45-7.17A5.6 5.6 0 0 0 6.9 7.2 3 3 0 0 0 7 13Z" fill="currentColor" opacity="0.65" stroke="none" />
        <path d="m12.5 13-2.1 4h3.1l-2 3.5" />
      </svg>
    );
  }

  if (icon === "moon") {
    return (
      <svg {...common}>
        <path d="M18.2 15.2A7.1 7.1 0 0 1 8.8 5.8 7.1 7.1 0 1 0 18.2 15.2Z" fill="currentColor" opacity="0.82" stroke="none" />
      </svg>
    );
  }

  if (icon === "evening") {
    return (
      <svg {...common}>
        <path d="M4 17h16" />
        <path d="M7 15a5 5 0 0 1 10 0" />
        <path d="M6.5 20h11" />
        <circle cx="18.2" cy="6.2" r="1" fill="currentColor" opacity="0.72" stroke="none" />
      </svg>
    );
  }

  if (icon === "briefcase") {
    return (
      <svg {...common}>
        <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" />
        <path d="M5 7h14v10.5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5V7Z" fill="currentColor" opacity="0.68" stroke="none" />
        <path d="M5 11.5h14" />
      </svg>
    );
  }

  if (icon === "sunrise") {
    return (
      <svg {...common}>
        <path d="M4 18h16" />
        <path d="M7 15a5 5 0 0 1 10 0" />
        <path d="M12 4v5" />
        <path d="m5.5 9.5 2.2 2.2" />
        <path d="m18.5 9.5-2.2 2.2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4.3" fill="currentColor" opacity="0.72" stroke="none" />
      <path d="M12 2.8v2" />
      <path d="M12 19.2v2" />
      <path d="m4.2 4.2 1.4 1.4" />
      <path d="m18.4 18.4 1.4 1.4" />
      <path d="M2.8 12h2" />
      <path d="M19.2 12h2" />
      <path d="m4.2 19.8 1.4-1.4" />
      <path d="m18.4 5.6 1.4-1.4" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8 13.6 8a3.6 3.6 0 0 0 2.4 2.4l5.2 1.6-5.2 1.6a3.6 3.6 0 0 0-2.4 2.4L12 21.2 10.4 16a3.6 3.6 0 0 0-2.4-2.4L2.8 12 8 10.4A3.6 3.6 0 0 0 10.4 8L12 2.8Z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.6 4.4C12.1 4.8 6.7 8.6 5.4 14.6c-.7-1-1-2.1-1.1-3.4a.9.9 0 0 0-1.8.1c.2 2.4 1.1 4.3 2.8 5.8-.1.9-.1 1.8 0 2.8a.9.9 0 0 0 1.8-.2c-.1-.6-.1-1.1-.1-1.7 6.8.8 11.9-3.7 13.6-12.6a.9.9 0 0 0-1-1Z" />
    </svg>
  );
}
