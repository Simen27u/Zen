import type { Palette, WeatherScene } from "../types/weather";
import { clamp01 } from "./weatherUtils";

export function getWeatherPalette(scene: WeatherScene, now: Date): Palette {
  const { sky, precipitation, intensity, thunder } = scene;

  const sceneBase = (() => {
    if (scene.isNight) {
      return {
        background: ["#050816", "#0d1327", "#131933"],
        glowA: [92, 112, 255, thunder ? 0.24 : 0.22] as const,
        glowB: [120, 84, 255, thunder ? 0.18 : 0.16] as const,
        glowC: [90, 176, 255, 0.12] as const,
      };
    }

    if (sky === "storm") {
      return {
        background: intensity === "heavy" ? ["#06111a", "#102233", "#1b3147"] : ["#09131d", "#13283c", "#243d56"],
        glowA: [83, 151, 255, 0.18] as const,
        glowB: [144, 201, 255, 0.08] as const,
        glowC: [88, 124, 168, 0.16] as const,
      };
    }

    if (precipitation === "snow") {
      return {
        background: ["#0e1520", "#243447", "#4d6278"],
        glowA: [215, 232, 255, 0.16] as const,
        glowB: [190, 214, 240, 0.1] as const,
        glowC: [255, 255, 255, 0.08] as const,
      };
    }

    if (precipitation === "sleet") {
      return {
        background: ["#0b1620", "#21384c", "#52657a"],
        glowA: [198, 221, 255, 0.15] as const,
        glowB: [146, 188, 240, 0.09] as const,
        glowC: [232, 240, 255, 0.07] as const,
      };
    }

    if (sky === "foggy") {
      return {
        background: ["#151c24", "#37424d", "#626d78"],
        glowA: [220, 230, 240, 0.12] as const,
        glowB: [188, 200, 214, 0.1] as const,
        glowC: [255, 255, 255, 0.06] as const,
      };
    }

    if (sky === "partly_cloudy") {
      return {
        background: ["#1f2233", "#4f4d63", "#efb884"],
        glowA: [255, 214, 153, 0.22] as const,
        glowB: [210, 220, 238, 0.1] as const,
        glowC: [255, 240, 200, 0.1] as const,
      };
    }

    if (sky === "clear") {
      return {
        background: ["#13203f", "#2d4785", "#6c8bd8"],
        glowA: [153, 205, 255, 0.22] as const,
        glowB: [255, 244, 195, 0.14] as const,
        glowC: [129, 165, 255, 0.16] as const,
      };
    }

    if (sky === "cloudy") {
      return {
        background: ["#131720", "#2a3340", "#465667"],
        glowA: [180, 196, 216, 0.16] as const,
        glowB: [132, 150, 177, 0.14] as const,
        glowC: [214, 223, 235, 0.1] as const,
      };
    }

    return {
      background: ["#101726", "#223552", "#3f607d"],
      glowA: [146, 184, 255, 0.18] as const,
      glowB: [202, 225, 255, 0.1] as const,
      glowC: [98, 132, 174, 0.14] as const,
    };
  })();

  const hour = now.getHours() + now.getMinutes() / 60;
  const anchors = [
    { hour: 0, colors: ["#050816", "#0d1327", "#131933"], glow: [92, 112, 255, 0.16] as const },
    { hour: 6, colors: ["#201126", "#6e4f66", "#f0b37a"], glow: [255, 210, 160, 0.16] as const },
    { hour: 12, colors: ["#13203f", "#3d66a8", "#8eb4ff"], glow: [190, 220, 255, 0.14] as const },
    { hour: 18, colors: ["#2a1630", "#81546a", "#ffb183"], glow: [255, 190, 160, 0.14] as const },
    { hour: 24, colors: ["#050816", "#0d1327", "#131933"], glow: [92, 112, 255, 0.16] as const },
  ];

  let start = anchors[0];
  let end = anchors[1];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (hour >= anchors[i].hour && hour <= anchors[i + 1].hour) {
      start = anchors[i];
      end = anchors[i + 1];
      break;
    }
  }

  const t = clamp01((hour - start.hour) / Math.max(1, end.hour - start.hour));
  const dayColors = [0, 1, 2].map((index) => mixHex(start.colors[index], end.colors[index], t));
  const dayGlow = mixRgbaTuple(start.glow, end.glow, t);

  const blendStrength = scene.isNight
    ? 0.12
    : scene.sky === "clear"
      ? 0.32
      : scene.sky === "partly_cloudy"
        ? 0.26
        : scene.sky === "foggy"
          ? 0.14
          : scene.sky === "storm"
            ? 0.08
            : 0.18;

  const backgroundStops = sceneBase.background.map((hex, index) => mixHex(hex, dayColors[index], blendStrength));
  const glowA = mixRgbaTuple(sceneBase.glowA, dayGlow, blendStrength);
  const glowB = mixRgbaTuple(sceneBase.glowB, dayGlow, blendStrength * 0.75);
  const glowC = mixRgbaTuple(sceneBase.glowC, dayGlow, blendStrength * 0.55);

  return {
    background: `linear-gradient(135deg, ${backgroundStops[0]} 0%, ${backgroundStops[1]} 44%, ${backgroundStops[2]} 100%)`,
    glowA: rgbaTupleToString(glowA),
    glowB: rgbaTupleToString(glowB),
    glowC: rgbaTupleToString(glowC),
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const value = Number.parseInt(full, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);

  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

function mixRgbaTuple(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

function rgbaTupleToString(value: readonly [number, number, number, number]) {
  return `rgba(${Math.round(value[0])}, ${Math.round(value[1])}, ${Math.round(value[2])}, ${value[3].toFixed(3)})`;
}
