import { useEffect, useMemo, useState } from "react";
import AmbientBackdrop from "./AmbientBackdrop";
import { buildAmbientLead } from "../lib/textSystem";
import { getWeatherPalette } from "../lib/weatherPalette";
import { parseWeatherScene } from "../lib/weatherScene";
import { formatDate, formatTime, getPeriodName, prettifySymbolCode } from "../lib/weatherUtils";
import type { Section, WeatherApiResponse, WeatherViewModel } from "../types/weather";

const DEFAULT_LAT = 59.9139;
const DEFAULT_LON = 10.7522;
const WEATHER_URL = "http://localhost:3001/api/weather";

const fallbackWeather: WeatherViewModel = {
  sourceLabel: "Oslo",
  temperature: 6,
  conditionLabel: "Regn",
  vibe: "Været inviterer til å senke skuldrene.",
  text: "6° ute og regn. Været inviterer til å senke skuldrene.",
  symbolCode: "rain",
};

export default function ZenDayUI() {
  const [now, setNow] = useState<Date>(new Date());
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [weatherError, setWeatherError] = useState<string>("");
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);

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

  const dateLabel = useMemo(() => formatDate(now), [now]);
  const timeLabel = useMemo(() => formatTime(now), [now]);
  const activeSectionTitle = useMemo(() => getPeriodName(now), [now]);

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

  const scene = useMemo(
    () => parseWeatherScene(liveWeather.symbolCode, activeSectionTitle),
    [liveWeather.symbolCode, activeSectionTitle]
  );

  const sections: Section[] = [
    {
      title: "Morgen",
      time: "06:00-09:00",
      mantra: "Rolig start.",
      prompt: "Begynn mykt.",
      status: activeSectionTitle === "Morgen" ? "Nå" : "Senere",
    },
    {
      title: "Jobb",
      time: "09:00-16:00",
      mantra: "Én ting av gangen.",
      prompt: "Hold rytmen enkel.",
      status: activeSectionTitle === "Jobb" ? "Nå" : "Senere",
    },
    {
      title: "Kveld",
      time: "16:00-22:00",
      mantra: "Senk skuldrene.",
      prompt: "Dagen trenger ikke presses videre.",
      status: activeSectionTitle === "Kveld" ? "Nå" : "Senere",
    },
    {
      title: "Natt",
      time: "22:00-06:00",
      mantra: "Ro ned.",
      prompt: "La resten slippe taket.",
      status: activeSectionTitle === "Natt" ? "Nå" : "Senere",
    },
  ];

  const activeSection = sections.find((section) => section.title === activeSectionTitle) || sections[0];
  const palette = useMemo(() => getWeatherPalette(scene, now), [scene, now]);

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white transition-[background] duration-[12000ms] ease-linear"
      style={{ background: palette.background }}
    >
      <AmbientBackdrop palette={palette} scene={scene} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-white/[0.45]">Zen</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight lg:text-7xl">{activeSection.title}</h1>
            <p className="mt-3 text-lg text-white/[0.72] lg:text-xl">{activeSection.mantra}</p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-medium lg:text-6xl">{timeLabel}</p>
            <p className="mt-2 text-sm text-white/[0.55]">{dateLabel}</p>
          </div>
        </header>

        <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-white/[0.45]">Nå</p>
            <p className="mt-4 max-w-3xl text-2xl leading-tight text-white/[0.92] lg:text-4xl">
              {buildAmbientLead(activeSection.title, liveWeather, isLoadingWeather)}
            </p>
            <p className="mt-6 text-base text-white/[0.62] lg:text-lg">{activeSection.prompt}</p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-black/10 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-white/[0.45]">Område</p>
                <h2 className="mt-2 text-2xl font-medium">{liveWeather.sourceLabel}</h2>
              </div>

              <div className="text-right">
                <p className="text-3xl font-medium">{isLoadingWeather ? "..." : `${liveWeather.temperature ?? "-"}°`}</p>
                <p className="mt-1 text-sm text-white/[0.55]">{isLoadingWeather ? "Laster" : liveWeather.conditionLabel}</p>
              </div>
            </div>

            <p className="mt-6 text-lg leading-8 text-white/75">
              {isLoadingWeather ? "Henter vær og stemning for området ditt." : liveWeather.vibe}
            </p>

            {weatherError ? (
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/85">
                Været kunne ikke hentes akkurat nå. Et lagret sted, standardsted eller reservevær vises i mellomtiden.
              </div>
            ) : null}
          </section>
        </div>

        <main className="mt-auto grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => {
            const active = section.title === activeSectionTitle;

            return (
              <section
                key={section.title}
                className={`rounded-[2rem] border px-5 py-5 backdrop-blur-xl transition-all duration-500 ${
                  active ? "border-white/20 bg-white/[0.12] shadow-xl shadow-black/20" : "border-white/[0.08] bg-black/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-medium">{section.title}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      active ? "bg-white/[0.16] text-white/90" : "bg-white/[0.08] text-white/[0.45]"
                    }`}
                  >
                    {section.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/[0.45]">{section.time}</p>
                <p className="mt-8 text-xl text-white/[0.82]">{section.mantra}</p>
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
