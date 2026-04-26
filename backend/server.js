import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;
const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const HOLIDAYS_URL = "https://api.api-ninjas.com/v2/holidays";
const API_NINJAS_KEY = process.env.API_NINJAS_KEY || "";
const USER_AGENT = "Zen local development weather guide (contact: local@example.com)";
const weatherCache = new Map();
const holidayCache = new Map();
const CACHE_MS = 10 * 60 * 1000;
const HOLIDAY_CACHE_MS = 24 * 60 * 60 * 1000;

const allowedOrigins = new Set(["http://localhost:3000", "https://simen27u.github.io"]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/weather", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: "lat og lon må være gyldige tall" });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: "lat eller lon er utenfor gyldig område" });
      return;
    }

    const roundedLat = roundCoordinate(lat);
    const roundedLon = roundCoordinate(lon);
    const cacheKey = `${roundedLat},${roundedLon}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt < CACHE_MS) {
      res.json(cached.payload);
      return;
    }

    const url = `${MET_URL}?lat=${roundedLat}&lon=${roundedLon}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`MET svarte med ${response.status}`);
    }

    const data = await response.json();
    const current = data?.properties?.timeseries?.[0]?.data;
    const details = current?.instant?.details;
    const temperature = normalizeTemperature(details?.air_temperature);
    const symbolCode = findSymbolCode(current);
    const vibe = buildVibe(symbolCode, temperature);
    const text = buildWeatherText(temperature, symbolCode, vibe);
    const locationInfo = await resolveLocationInfo(roundedLat, roundedLon);

    const payload = {
      weather: {
        temperature,
        symbolCode,
        vibe,
        text,
      },
      meta: {
        locationName: locationInfo.locationName,
        countryCode: locationInfo.countryCode,
      },
    };

    weatherCache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });

    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    res.status(502).json({ error: message });
  }
});

app.get("/api/holidays", async (req, res) => {
  const country = normalizeCountryCode(req.query.country);
  const year = normalizeYear(req.query.year);

  if (!country) {
    res.status(400).json({ error: "country må være en ISO-landkode, for eksempel NO" });
    return;
  }

  const cacheKey = `${country}:${year}`;
  const cached = holidayCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < HOLIDAY_CACHE_MS) {
    res.json(cached.payload);
    return;
  }

  const payload = await loadHolidayPayload(country, year);
  holidayCache.set(cacheKey, {
    createdAt: Date.now(),
    payload,
  });
  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`Zen backend kjører på http://localhost:${PORT}`);
});

async function loadHolidayPayload(country, year) {
  if (API_NINJAS_KEY) {
    try {
      const url = `${HOLIDAYS_URL}?country=${encodeURIComponent(country)}&year=${year}`;
      const response = await fetch(url, {
        headers: {
          "X-Api-Key": API_NINJAS_KEY,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const holidays = normalizeApiNinjasHolidays(data);
        return {
          country: getCountryName(country),
          iso: country,
          year,
          source: "api_ninjas",
          holidays,
        };
      }
    } catch {
      // Fallback below keeps Zen usable without depending on the external API.
    }
  }

  if (country === "NO") {
    return {
      country: "Norway",
      iso: "NO",
      year,
      source: "fallback_no",
      holidays: getNorwegianHolidays(year),
    };
  }

  return {
    country: getCountryName(country),
    iso: country,
    year,
    source: "fallback_empty",
    holidays: [],
  };
}

function normalizeApiNinjasHolidays(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((holiday) => {
      const date = typeof holiday?.date === "string" ? holiday.date : "";
      const name = typeof holiday?.name === "string" ? holiday.name : "";
      const typeValue = Array.isArray(holiday?.type) ? holiday.type.join(", ") : holiday?.type;
      const type = typeof typeValue === "string" && typeValue.trim() ? typeValue : "HOLIDAY";

      return { date, name, type };
    })
    .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(holiday.date) && holiday.name);
}

function normalizeCountryCode(value) {
  if (typeof value !== "string") return "NO";
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function normalizeYear(value) {
  const year = Number(value || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 1970 || year > 2100) return new Date().getFullYear();
  return year;
}

function getCountryName(country) {
  const names = {
    NO: "Norway",
    SE: "Sweden",
    DK: "Denmark",
    FI: "Finland",
    IS: "Iceland",
    US: "United States",
    GB: "United Kingdom",
  };

  return names[country] || country;
}

function getNorwegianHolidays(year) {
  const easter = getEasterSunday(year);
  const holidays = [
    { date: `${year}-01-01`, name: "Første nyttårsdag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, -3)), name: "Skjærtorsdag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, -2)), name: "Langfredag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(easter), name: "Første påskedag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, 1)), name: "Andre påskedag", type: "PUBLIC_HOLIDAY" },
    { date: `${year}-05-01`, name: "Arbeidernes dag", type: "PUBLIC_HOLIDAY" },
    { date: `${year}-05-17`, name: "Grunnlovsdagen", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, 39)), name: "Kristi himmelfartsdag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, 49)), name: "Første pinsedag", type: "PUBLIC_HOLIDAY" },
    { date: toIsoDate(addDays(easter, 50)), name: "Andre pinsedag", type: "PUBLIC_HOLIDAY" },
    { date: `${year}-12-25`, name: "Første juledag", type: "PUBLIC_HOLIDAY" },
    { date: `${year}-12-26`, name: "Andre juledag", type: "PUBLIC_HOLIDAY" },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundCoordinate(value) {
  return Number(value.toFixed(4));
}

function normalizeTemperature(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function findSymbolCode(current) {
  return (
    current?.next_1_hours?.summary?.symbol_code ||
    current?.next_6_hours?.summary?.symbol_code ||
    current?.next_12_hours?.summary?.symbol_code ||
    "clearsky_day"
  );
}

function buildLocationName(lat, lon) {
  const isOslo = Math.abs(lat - 59.9139) < 0.02 && Math.abs(lon - 10.7522) < 0.02;
  if (isOslo) return "Oslo";

  const nearbyPlace = findKnownNearbyPlace(lat, lon, 18);
  if (nearbyPlace) return nearbyPlace.name;

  return `Nær ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function inferCountryCodeFromCoordinates(lat, lon) {
  if (lat >= 57 && lat <= 72 && lon >= 4 && lon <= 32) return "NO";
  return "";
}

function findKnownNearbyPlace(lat, lon, maxDistanceKm) {
  const places = [
    { name: "Oslo", lat: 59.9139, lon: 10.7522, countryCode: "NO" },
    { name: "Lillestrøm", lat: 59.956, lon: 11.0492, countryCode: "NO" },
    { name: "Strømmen", lat: 59.95, lon: 11.0, countryCode: "NO" },
    { name: "Lørenskog", lat: 59.93, lon: 10.96, countryCode: "NO" },
    { name: "Jessheim", lat: 60.1415, lon: 11.1752, countryCode: "NO" },
    { name: "Kløfta", lat: 60.0741, lon: 11.1381, countryCode: "NO" },
    { name: "Ask", lat: 60.071, lon: 11.035, countryCode: "NO" },
    { name: "Gjerdrum", lat: 60.071, lon: 11.035, countryCode: "NO" },
    { name: "Nannestad", lat: 60.217, lon: 11.012, countryCode: "NO" },
    { name: "Eidsvoll", lat: 60.3306, lon: 11.2616, countryCode: "NO" },
    { name: "Sørumsand", lat: 59.987, lon: 11.24, countryCode: "NO" },
    { name: "Fetsund", lat: 59.929, lon: 11.162, countryCode: "NO" },
    { name: "Vossevangen", lat: 60.6297, lon: 6.4147, countryCode: "NO" },
  ];

  const nearest = places
    .map((place) => ({
      ...place,
      distance: getDistanceKm(lat, lon, place.lat, place.lon),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest && nearest.distance <= maxDistanceKm ? nearest : null;
}

function getDistanceKm(latA, lonA, latB, lonB) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

async function resolveLocationInfo(lat, lon) {
  const closeKnownPlace = findKnownNearbyPlace(lat, lon, 4);
  if (closeKnownPlace) {
    return { locationName: closeKnownPlace.name, countryCode: closeKnownPlace.countryCode };
  }

  const geocodeJsonInfo = await resolveGeocodeJsonLocationInfo(lat, lon);
  if (geocodeJsonInfo.locationName) return geocodeJsonInfo;

  const jsonInfo = await resolveJsonLocationInfo(lat, lon);
  if (jsonInfo.locationName) return jsonInfo;

  return {
    locationName: buildLocationName(lat, lon),
    countryCode: inferCountryCodeFromCoordinates(lat, lon),
  };
}

async function resolveGeocodeJsonLocationInfo(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}?format=geocodejson&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=nb,no,en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { locationName: "", countryCode: "" };
    }

    const data = await response.json();
    const geocoding = data?.features?.[0]?.properties?.geocoding;
    const admin = geocoding?.admin || {};
    const locationName = geocoding?.city || geocoding?.locality || geocoding?.district || admin.level8 || admin.level7 || admin.level6 || geocoding?.county || "";
    const countryCode = typeof geocoding?.country_code === "string" ? geocoding.country_code.toUpperCase() : "";

    return { locationName, countryCode };
  } catch {
    return { locationName: "", countryCode: "" };
  }
}

async function resolveJsonLocationInfo(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=nb,no,en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { locationName: "", countryCode: "" };
    }

    const data = await response.json();
    const address = data?.address || {};
    const locationName =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      address.municipality ||
      address.county ||
      address.state ||
      data?.name ||
      "";
    const countryCode = typeof address.country_code === "string" ? address.country_code.toUpperCase() : "";

    return { locationName, countryCode };
  } catch {
    return { locationName: "", countryCode: "" };
  }
}

function buildVibe(symbolCode, temperature) {
  const code = symbolCode.toLowerCase();

  if (code.includes("thunder")) return "Været ber om litt mer ro og litt færre kanter.";
  if (code.includes("heavyrain")) return "Regnet fyller rommet utenfor, og tempoet kan få falle litt.";
  if (code.includes("rain")) return "Været inviterer til å senke skuldrene.";
  if (code.includes("snow")) return "Snøen demper verden og gjør dagen mykere.";
  if (code.includes("sleet")) return "Luften er rå og skiftende, så hold rytmen enkel.";
  if (code.includes("fog")) return "Tåken gjør horisonten mindre. Det er nok å se neste steg.";
  if (code.includes("cloudy")) return "Skyene legger et rolig lokk over dagen.";
  if (code.includes("fair") || code.includes("partlycloudy")) return "Lyset får slippe gjennom i små, rolige glimt.";
  if (code.includes("clearsky") && temperature !== null && temperature <= 0) return "Klar luft og lave grader gir dagen en stille kant.";
  if (code.includes("clearsky")) return "Klarvær gir dagen mer rom og et lettere drag.";

  return "Været ligger stille i bakgrunnen og lar dagen få sin rytme.";
}

function buildWeatherText(temperature, symbolCode, vibe) {
  const readable = prettifySymbolCode(symbolCode).toLowerCase();
  const tempText = temperature === null ? "Været" : `${temperature}° ute`;
  return `${tempText} og ${readable}. ${vibe}`;
}

function prettifySymbolCode(symbolCode) {
  const map = {
    clearsky_day: "klarvær",
    clearsky_night: "klar natt",
    clearsky_polartwilight: "klarvær",
    fair_day: "pent vær",
    fair_night: "rolig natt",
    fair_polartwilight: "pent vær",
    partlycloudy_day: "delvis skyet",
    partlycloudy_night: "delvis skyet",
    partlycloudy_polartwilight: "delvis skyet",
    cloudy: "overskyet",
    fog: "tåke",
    lightrain: "lett regn",
    rain: "regn",
    heavyrain: "kraftig regn",
    lightsnow: "lett snø",
    snow: "snø",
    heavysnow: "kraftig snø",
    sleet: "sludd",
    lightsleet: "lett sludd",
    heavysleet: "kraftig sludd",
    rainshowers_day: "regnbyger",
    rainshowers_night: "regnbyger",
    rainshowers_polartwilight: "regnbyger",
    snowshowers_day: "snøbyger",
    snowshowers_night: "snøbyger",
    snowshowers_polartwilight: "snøbyger",
    thunderstorm: "tordenvær",
    lightrainandthunder: "lett regn og torden",
    rainandthunder: "regn og torden",
    heavyrainandthunder: "kraftig regn og torden",
  };

  return map[symbolCode] || "rolig vær";
}
