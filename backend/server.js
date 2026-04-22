import express from "express";

const app = express();
const PORT = 3001;
const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Zen local development weather guide (contact: local@example.com)";
const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
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
    const cached = cache.get(cacheKey);

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
    const locationName = await resolveLocationName(roundedLat, roundedLon);

    const payload = {
      weather: {
        temperature,
        symbolCode,
        vibe,
        text,
      },
      meta: {
        locationName,
      },
    };

    cache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });

    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Zen backend kjører på http://localhost:${PORT}`);
});

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
  if (nearbyPlace) return nearbyPlace;

  return `Nær ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function findKnownNearbyPlace(lat, lon, maxDistanceKm) {
  const places = [
    { name: "Oslo", lat: 59.9139, lon: 10.7522 },
    { name: "Lillestrøm", lat: 59.956, lon: 11.0492 },
    { name: "Strømmen", lat: 59.95, lon: 11.0 },
    { name: "Lørenskog", lat: 59.93, lon: 10.96 },
    { name: "Jessheim", lat: 60.1415, lon: 11.1752 },
    { name: "Kløfta", lat: 60.0741, lon: 11.1381 },
    { name: "Ask", lat: 60.071, lon: 11.035 },
    { name: "Gjerdrum", lat: 60.071, lon: 11.035 },
    { name: "Nannestad", lat: 60.217, lon: 11.012 },
    { name: "Eidsvoll", lat: 60.3306, lon: 11.2616 },
    { name: "Sørumsand", lat: 59.987, lon: 11.24 },
    { name: "Fetsund", lat: 59.929, lon: 11.162 },
  ];

  const nearest = places
    .map((place) => ({
      ...place,
      distance: getDistanceKm(lat, lon, place.lat, place.lon),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest && nearest.distance <= maxDistanceKm ? nearest.name : "";
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

async function resolveLocationName(lat, lon) {
  const closeKnownPlace = findKnownNearbyPlace(lat, lon, 4);
  if (closeKnownPlace) return closeKnownPlace;

  const geocodeJsonName = await resolveGeocodeJsonLocationName(lat, lon);
  if (geocodeJsonName) return geocodeJsonName;

  const jsonName = await resolveJsonLocationName(lat, lon);
  if (jsonName) return jsonName;

  return buildLocationName(lat, lon);
}

async function resolveGeocodeJsonLocationName(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}?format=geocodejson&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=nb,no,en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const geocoding = data?.features?.[0]?.properties?.geocoding;
    const admin = geocoding?.admin || {};

    return geocoding?.city || geocoding?.locality || geocoding?.district || admin.level8 || admin.level7 || admin.level6 || geocoding?.county || "";
  } catch {
    return "";
  }
}

async function resolveJsonLocationName(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=nb,no,en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const address = data?.address || {};
    const name =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      address.municipality ||
      address.county ||
      address.state ||
      data?.name;

    return name || "";
  } catch {
    return "";
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
