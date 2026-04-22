import { useEffect, useMemo, useState } from "react";
import AmbientBackdrop from "./AmbientBackdrop";
import { buildAmbientLead, buildLocationVibe, getGreeting, getWeatherSummary } from "../lib/textSystem";
import { getWeatherPalette } from "../lib/weatherPalette";
import { parseWeatherScene } from "../lib/weatherScene";
import { formatDate, formatTime, getPeriodName, prettifySymbolCode } from "../lib/weatherUtils";
import type { Section, SectionTitle, SmallStep, WeatherApiResponse, WeatherViewModel } from "../types/weather";

const DEFAULT_LAT = 59.9139;
const DEFAULT_LON = 10.7522;
const WEATHER_URL = "http://localhost:3001/api/weather";
const SMALL_STEPS_KEY = "zen_small_steps";

const fallbackWeather: WeatherViewModel = {
  sourceLabel: "Oslo",
  temperature: 6,
  conditionLabel: "Regn",
  vibe: "Været inviterer til å senke skuldrene.",
  text: "6° ute og regn. Været inviterer til å senke skuldrene.",
  symbolCode: "rain",
};

const weatherSamples = [
  { label: "Klarvær", symbolCode: "clearsky_day", temperature: 18 },
  { label: "Delvis skyet", symbolCode: "partlycloudy_day", temperature: 19 },
  { label: "Overskyet", symbolCode: "cloudy", temperature: 14 },
  { label: "Tåke", symbolCode: "fog", temperature: 8 },
  { label: "Regn", symbolCode: "rain", temperature: 9 },
  { label: "Kraftig regn", symbolCode: "heavyrain", temperature: 7 },
  { label: "Snø", symbolCode: "snow", temperature: -2 },
  { label: "Sludd", symbolCode: "sleet", temperature: 2 },
  { label: "Storm", symbolCode: "heavyrainandthunder", temperature: 11 },
] as const;

const timeSamples = [
  { label: "Live", sectionTitle: null },
  { label: "Morgen", sectionTitle: "Morgen" },
  { label: "Jobb", sectionTitle: "Jobb" },
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
  const [isWeatherLabOpen, setIsWeatherLabOpen] = useState<boolean>(false);
  const [smallSteps, setSmallSteps] = useState<SmallStep[]>(() => loadSmallSteps());
  const [isSmallStepOpen, setIsSmallStepOpen] = useState<boolean>(false);

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
          label: data.meta?.locationName || source,
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
      void loadWeatherForCoords(DEFAULT_LAT, DEFAULT_LON, "Oslo");
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

  const dateLabel = useMemo(() => formatDate(now), [now]);
  const timeLabel = useMemo(() => formatTime(now), [now]);
  const liveSectionTitle = useMemo(() => getPeriodName(now), [now]);
  const activeSectionTitle = sectionOverride || liveSectionTitle;
  const displayNow = useMemo(() => getPreviewDate(now, sectionOverride), [now, sectionOverride]);
  const displayTimeLabel = useMemo(() => formatTime(displayNow), [displayNow]);
  const dayProgress = useMemo(() => getDayProgress(displayNow), [displayNow]);

  const liveWeather: WeatherViewModel = weatherData?.weather
    ? {
        sourceLabel: weatherData.meta?.locationName || userLocation?.label || "Ukjent område",
        temperature: weatherData.weather.temperature ?? null,
        conditionLabel: prettifySymbolCode(weatherData.weather.symbolCode),
        vibe: weatherData.weather.vibe || fallbackWeather.vibe,
        text: weatherData.weather.text || fallbackWeather.text,
        symbolCode: weatherData.weather.symbolCode || fallbackWeather.symbolCode,
      }
    : {
        ...fallbackWeather,
        sourceLabel: weatherData?.meta?.locationName || userLocation?.label || fallbackWeather.sourceLabel,
      };

  const displayWeather: WeatherViewModel = weatherOverride
    ? {
        sourceLabel: liveWeather.sourceLabel,
        temperature: weatherOverride.temperature,
        conditionLabel: prettifySymbolCode(weatherOverride.symbolCode),
        vibe: getWeatherSummary({
          ...liveWeather,
          temperature: weatherOverride.temperature,
          symbolCode: weatherOverride.symbolCode,
        }),
        text: `${weatherOverride.temperature}° ute og ${prettifySymbolCode(weatherOverride.symbolCode).toLowerCase()}.`,
        symbolCode: weatherOverride.symbolCode,
      }
    : liveWeather;

  const scene = useMemo(
    () => parseWeatherScene(displayWeather.symbolCode, activeSectionTitle),
    [displayWeather.symbolCode, activeSectionTitle]
  );
  const sections = useMemo(() => buildSections(activeSectionTitle), [activeSectionTitle]);
  const activeSection = sections.find((section) => section.title === activeSectionTitle) || sections[0];
  const palette = useMemo(() => getWeatherPalette(scene, displayNow), [scene, displayNow]);
  const weatherIcon = getWeatherIcon(displayWeather.symbolCode, activeSectionTitle);

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

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white transition-[background] duration-[12000ms] ease-linear"
      style={{ background: palette.background }}
    >
      <AmbientBackdrop palette={palette} scene={scene} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/[0.48]">Zen</p>
            <h1 className="mt-5 text-5xl font-semibold leading-none tracking-normal text-white sm:text-6xl lg:text-7xl">
              {getGreeting(activeSectionTitle)}
            </h1>
            <p className="mt-5 text-xl text-white/[0.72]">{getGreetingSubtext(activeSectionTitle)}</p>
          </div>

          <div className="shrink-0 flex flex-col items-start gap-4 lg:items-end">
            <div className="text-left lg:text-right">
              <p className="text-5xl font-light leading-none tracking-normal sm:text-6xl">{displayTimeLabel}</p>
              <p className="mt-3 text-sm text-white/[0.56]">{dateLabel}</p>
            </div>
            <div className="flex items-center gap-4 rounded-full border border-white/[0.08] bg-white/[0.11] px-5 py-4 shadow-2xl shadow-black/10 backdrop-blur-2xl">
              <WeatherGlyph icon={weatherIcon} className="h-9 w-9 text-white" />
              <p className="text-2xl font-semibold leading-none">{isLoadingWeather && !weatherOverride ? "..." : `${displayWeather.temperature ?? "-"}°`}</p>
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-5 lg:mt-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.65fr)]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.11] px-6 py-7 shadow-2xl shadow-black/15 backdrop-blur-2xl sm:px-8 sm:py-8 lg:min-h-[20.5rem]">
            <div className="absolute inset-y-0 right-0 w-[55%] opacity-80">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgba(255,214,164,0.36),transparent_34%),radial-gradient(circle_at_45%_58%,rgba(255,255,255,0.14),transparent_42%)]" />
              <div className="absolute bottom-0 right-[-4%] h-40 w-[85%] rounded-t-full bg-white/[0.06] blur-2xl" />
              <div className="absolute bottom-10 right-[10%] h-24 w-[58%] rounded-full bg-white/[0.08] blur-xl" />
            </div>

            <div className="relative max-w-2xl pr-0 sm:pr-6">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/[0.58]">
                <SparkleIcon className="h-4 w-4" />
                Nå
              </p>
              <p className="mt-8 text-3xl leading-tight text-white/[0.94] sm:text-4xl lg:text-[2.55rem]">
                {buildAmbientLead(activeSection.title, displayWeather, isLoadingWeather && !weatherOverride)}
              </p>
              <p className="mt-8 max-w-xl text-lg leading-8 text-white/[0.64]">{activeSection.prompt}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/[0.11] bg-white/[0.1] px-6 py-7 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:px-8">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/[0.58]">
              <PinIcon className="h-4 w-4" />
              Område
            </p>
            <h2 className="mt-8 text-3xl font-medium tracking-normal">{displayWeather.sourceLabel}</h2>
            <div className="mt-5 flex items-center gap-3 border-b border-white/[0.12] pb-5 text-white/[0.7]">
              <span className="text-xl font-semibold text-white">{isLoadingWeather && !weatherOverride ? "..." : `${displayWeather.temperature ?? "-"}°`}</span>
              <span>{isLoadingWeather && !weatherOverride ? "Laster vær" : displayWeather.conditionLabel}</span>
            </div>
            <p className="mt-7 text-xl leading-8 text-white/[0.74]">
              {isLoadingWeather && !weatherOverride ? "Henter vær og stemning for området ditt." : buildLocationVibe(activeSection.title, displayWeather)}
            </p>

            {weatherError ? (
              <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/85">
                Været kunne ikke hentes akkurat nå. Et lagret sted, standardsted eller reservevær vises i mellomtiden.
              </div>
            ) : null}
          </section>
        </main>

        <section className="mt-auto pt-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => {
              const active = section.title === activeSectionTitle;
              const icon = getSectionIcon(section.title);
              const visibleSteps = smallSteps.filter((step) => step.sectionTitle === section.title && !isExpiredSmallStep(step)).slice(0, 3);

              return (
                <section
                  key={section.title}
                  className={`rounded-[1.65rem] border px-5 py-5 backdrop-blur-2xl transition-all duration-500 ${
                    active
                      ? "border-white/[0.34] bg-white/[0.16] shadow-2xl shadow-black/15"
                      : "border-white/[0.1] bg-black/[0.08]"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={`grid h-12 w-12 place-items-center rounded-full ${active ? "bg-white/[0.16]" : "bg-white/[0.09]"}`}>
                        <WeatherGlyph icon={icon} className="h-6 w-6 text-white/[0.86]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold">{section.title}</h3>
                        <p className="mt-1 text-sm text-white/[0.52]">{section.time}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
                        active ? "bg-white/[0.18] text-white/90" : "bg-white/[0.09] text-white/[0.5]"
                      }`}
                    >
                      {section.status}
                    </span>
                  </div>
                  <p className="mt-8 text-xl text-white/[0.88]">{section.mantra}</p>
                  <p className="mt-3 text-sm leading-6 text-white/[0.64]">{section.prompt}</p>
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

          <p className="mx-auto mt-3 flex max-w-max items-center gap-3 text-center text-base text-white/[0.56]">
            <LeafIcon className="h-5 w-5" />
            Små steg hver dag. Mer enn nok over tid.
          </p>
        </section>
      </div>

      <WeatherLab
        activeSample={weatherOverride?.symbolCode || ""}
        activeSection={sectionOverride}
        isOpen={isWeatherLabOpen}
        onClose={() => setIsWeatherLabOpen(false)}
        onReset={() => {
          setWeatherOverride(null);
          setSectionOverride(null);
        }}
        onSelectSection={setSectionOverride}
        onSelect={(sample) => setWeatherOverride(sample)}
        onToggle={() => setIsWeatherLabOpen((open) => !open)}
      />
      <SmallStepPanel
        isOpen={isSmallStepOpen}
        onAdd={handleAddSmallStep}
        onClose={() => setIsSmallStepOpen(false)}
        onToggle={() => setIsSmallStepOpen((open) => !open)}
      />
    </div>
  );
}

function buildSections(activeSectionTitle: SectionTitle): Section[] {
  return [
    {
      title: "Morgen",
      time: "06:00-09:00",
      mantra: "Start mykt.",
      prompt: "Finn ro før fart.",
      status: activeSectionTitle === "Morgen" ? "Nå" : "Senere",
    },
    {
      title: "Jobb",
      time: "09:00-16:00",
      mantra: "Fokuser med flyt.",
      prompt: "Én ting tydelig foran deg.",
      status: activeSectionTitle === "Jobb" ? "Nå" : "Senere",
    },
    {
      title: "Kveld",
      time: "16:00-22:00",
      mantra: "Senke skuldrene.",
      prompt: "La dagen lande.",
      status: activeSectionTitle === "Kveld" ? "Nå" : "Senere",
    },
    {
      title: "Natt",
      time: "22:00-06:00",
      mantra: "Ro ned.",
      prompt: "Resten kan vente.",
      status: activeSectionTitle === "Natt" ? "Nå" : "Senere",
    },
  ];
}

function getGreetingSubtext(sectionTitle: SectionTitle) {
  const map: Record<SectionTitle, string> = {
    Morgen: "En rolig inngang til dagen.",
    Jobb: "En tydelig rytme, ett steg av gangen.",
    Kveld: "Dagen kan få slippe taket.",
    Natt: "Lavere lys. Mindre å bære.",
  };

  return map[sectionTitle];
}

function WeatherLab({
  activeSample,
  activeSection,
  isOpen,
  onClose,
  onReset,
  onSelectSection,
  onSelect,
  onToggle,
}: {
  activeSample: string;
  activeSection: SectionTitle | null;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onSelectSection: (sectionTitle: SectionTitle | null) => void;
  onSelect: (sample: (typeof weatherSamples)[number]) => void;
  onToggle: () => void;
}) {
  if (!isOpen) {
    return (
      <button
        className="fixed bottom-5 left-5 z-20 rounded-full border border-white/[0.14] bg-black/[0.18] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/[0.72] shadow-2xl shadow-black/20 backdrop-blur-2xl transition hover:bg-white/[0.12] hover:text-white"
        type="button"
        onClick={onToggle}
      >
        Værtest
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-20 w-[min(28rem,calc(100vw-2.5rem))] rounded-[1.5rem] border border-white/[0.14] bg-black/[0.24] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/[0.58]">DEV værtest</p>
          <p className="mt-1 text-sm text-white/[0.68]">Prøv vær og tid uten å vente.</p>
        </div>
        <button className="rounded-full bg-white/[0.1] px-3 py-2 text-sm text-white/[0.74] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onClose}>
          Lukk
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">Tid</p>
        <div className="grid grid-cols-5 gap-2">
          {timeSamples.map((sample) => {
            const active = activeSection === sample.sectionTitle;
            return (
              <button
                key={sample.label}
                className={`rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ${
                  active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
                }`}
                type="button"
                onClick={() => onSelectSection(sample.sectionTitle)}
              >
                {sample.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/[0.5]">Vær</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {weatherSamples.map((sample) => {
          const active = activeSample === sample.symbolCode;
          return (
            <button
              key={sample.symbolCode}
              className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                active ? "border-white/[0.38] bg-white/[0.18] text-white" : "border-white/[0.1] bg-white/[0.07] text-white/[0.72] hover:bg-white/[0.12]"
              }`}
              type="button"
              onClick={() => onSelect(sample)}
            >
              <span className="block font-semibold">{sample.label}</span>
              <span className="mt-1 block text-xs text-white/[0.54]">{sample.symbolCode}</span>
            </button>
          );
        })}
      </div>

      <button className="mt-3 w-full rounded-2xl bg-white/[0.1] px-4 py-3 text-sm font-semibold text-white/[0.75] transition hover:bg-white/[0.16] hover:text-white" type="button" onClick={onReset}>
        Tilbake til live-vær
      </button>
    </div>
  );
}

function SmallStepPanel({
  isOpen,
  onAdd,
  onClose,
  onToggle,
}: {
  isOpen: boolean;
  onAdd: (text: string, scope: SmallStep["scope"]) => void;
  onClose: () => void;
  onToggle: () => void;
}) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<SmallStep["scope"]>("today");

  function submit() {
    if (!text.trim()) return;
    onAdd(text, scope);
    setText("");
    onClose();
  }

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-5 right-5 z-20 grid h-12 w-12 place-items-center rounded-full border border-white/[0.16] bg-white/[0.12] text-2xl font-light text-white/[0.84] shadow-2xl shadow-black/25 backdrop-blur-2xl transition hover:bg-white/[0.18] hover:text-white"
        type="button"
        aria-label="Legg til et lite steg"
        onClick={onToggle}
      >
        +
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-20 w-[min(24rem,calc(100vw-2.5rem))] rounded-[1.5rem] border border-white/[0.14] bg-black/[0.26] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
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

    return parsed.filter(isSmallStep);
  } catch {
    return [];
  }
}

function isSmallStep(value: unknown): value is SmallStep {
  const maybe = value as SmallStep;
  return (
    typeof maybe?.id === "string" &&
    typeof maybe.text === "string" &&
    (maybe.scope === "today" || maybe.scope === "week") &&
    ["Morgen", "Jobb", "Kveld", "Natt"].includes(maybe.sectionTitle) &&
    typeof maybe.createdAt === "string" &&
    typeof maybe.done === "boolean"
  );
}

function placeSmallStep(text: string, fallback: SectionTitle): SectionTitle {
  const normalized = text.toLowerCase();

  if (matchesAny(normalized, ["seng", "senga", "frokost", "morgen", "kaffe", "dusj", "trening", "gå tur"])) return "Morgen";
  if (matchesAny(normalized, ["jobb", "mail", "e-post", "epost", "møte", "rapport", "søknad", "ringe", "send"])) return "Jobb";
  if (matchesAny(normalized, ["rydde", "vaske", "kjøkken", "middag", "handle", "søppel", "klesvask", "mat"])) return "Kveld";
  if (matchesAny(normalized, ["lese", "sove", "puste", "meditere", "journal", "bok", "legge meg"])) return "Natt";

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

function getPreviewDate(now: Date, sectionTitle: SectionTitle | null) {
  if (!sectionTitle) return now;

  const preview = new Date(now);
  const hourBySection: Record<SectionTitle, number> = {
    Morgen: 7,
    Jobb: 12,
    Kveld: 19,
    Natt: 23,
  };

  preview.setHours(hourBySection[sectionTitle], 0, 0, 0);
  return preview;
}

function getDayProgress(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return Math.min(100, Math.max(0, (minutes / 1440) * 100));
}

function getSectionIcon(sectionTitle: SectionTitle) {
  const map: Record<SectionTitle, WeatherIcon> = {
    Morgen: "sunrise",
    Jobb: "briefcase",
    Kveld: "moon",
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

type WeatherIcon = "sun" | "sunrise" | "cloud" | "rain" | "snow" | "fog" | "storm" | "moon" | "briefcase";

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
