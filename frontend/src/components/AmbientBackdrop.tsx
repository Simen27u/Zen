import { useEffect, useRef } from "react";
import type { Palette, WeatherScene } from "../types/weather";

export default function AmbientBackdrop({ palette, scene }: { palette: Palette; scene: WeatherScene }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { precipitation, sky, thunder, wind, intensity } = scene;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const canvasElement = canvas;
    const ctx = context;

    type Drop = {
      x: number;
      y: number;
      length: number;
      thickness: number;
      speedY: number;
      speedX: number;
      alpha: number;
      kind: "rain" | "sleet";
    };

    type Flake = {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      alpha: number;
      wobble: number;
      phase: number;
    };

    type Splash = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      radius: number;
      alpha: number;
    };

    type LightningBolt = {
      points: Array<{ x: number; y: number }>;
      branches: Array<Array<{ x: number; y: number }>>;
      life: number;
      maxLife: number;
      alpha: number;
    };

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lastTime = 0;
    let lightningAt = Math.random() * 10 + 3;
    let lightningOpacity = 0;
    let elapsed = 0;
    let lightningBolt: LightningBolt | null = null;

    const drops: Drop[] = [];
    const flakes: Flake[] = [];
    const splashes: Splash[] = [];

    const windMultiplier = wind === "windy" ? 1.55 : wind === "breezy" ? 1.18 : 1;
    const intensityMultiplier = intensity === "heavy" ? 1.35 : intensity === "light" ? 0.72 : 1;
    const rainCount =
      precipitation === "rain" ? Math.round(120 * intensityMultiplier) : precipitation === "sleet" ? Math.round(72 * intensityMultiplier) : 0;
    const snowCount =
      precipitation === "snow" ? Math.round(110 * intensityMultiplier) : precipitation === "sleet" ? Math.round(36 * intensityMultiplier) : 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasElement.width = Math.floor(width * dpr);
      canvasElement.height = Math.floor(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function randomBetween(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function createDrop(index: number, kind: "rain" | "sleet"): Drop {
      const near = index % 3 === 2;
      const mid = index % 3 === 1;
      const baseY = kind === "sleet" ? 760 : 900;
      const speedY = (near ? baseY + 420 : mid ? baseY + 180 : baseY - 60) * intensityMultiplier;
      const speedXBase = kind === "sleet" ? -120 : -150;

      return {
        x: Math.random() * width,
        y: randomBetween(-height, height),
        length:
          kind === "sleet"
            ? near
              ? randomBetween(10, 16)
              : randomBetween(8, 13)
            : near
              ? randomBetween(18, 30)
              : mid
                ? randomBetween(13, 22)
                : randomBetween(9, 16),
        thickness:
          kind === "sleet"
            ? near
              ? randomBetween(1.2, 1.8)
              : randomBetween(0.8, 1.3)
            : near
              ? randomBetween(1.3, 1.9)
              : mid
                ? randomBetween(0.9, 1.4)
                : randomBetween(0.6, 1),
        speedY,
        speedX: randomBetween(speedXBase - 24, speedXBase + 24) * windMultiplier,
        alpha:
          kind === "sleet"
            ? randomBetween(0.22, 0.34)
            : near
              ? randomBetween(0.24, 0.38)
              : mid
                ? randomBetween(0.18, 0.28)
                : randomBetween(0.12, 0.18),
        kind,
      };
    }

    function createFlake(index: number): Flake {
      const near = index % 3 === 2;
      const mid = index % 3 === 1;

      return {
        x: Math.random() * width,
        y: randomBetween(-height, height),
        radius: near ? randomBetween(2.8, 4.2) : mid ? randomBetween(1.8, 2.8) : randomBetween(1, 1.8),
        speedY:
          (near ? randomBetween(62, 95) : mid ? randomBetween(40, 68) : randomBetween(22, 42)) *
          (intensity === "heavy" ? 1.18 : intensity === "light" ? 0.9 : 1),
        speedX: randomBetween(-18, 18) * windMultiplier,
        alpha: near ? randomBetween(0.34, 0.5) : mid ? randomBetween(0.24, 0.36) : randomBetween(0.16, 0.24),
        wobble: near ? randomBetween(16, 26) : mid ? randomBetween(10, 18) : randomBetween(6, 12),
        phase: Math.random() * Math.PI * 2,
      };
    }

    function resetDrop(drop: Drop) {
      drop.x = Math.random() * (width + 180) - 40;
      drop.y = randomBetween(-160, -20);
    }

    function resetFlake(flake: Flake, fromTop = true) {
      flake.x = Math.random() * (width + 80) - 40;
      flake.y = fromTop ? randomBetween(-80, -10) : randomBetween(-height * 0.2, height * 0.1);
      flake.phase = Math.random() * Math.PI * 2;
    }

    function createSplash(x: number, y: number, strength = 1) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        splashes.push({
          x,
          y,
          vx: randomBetween(-24, 24) * strength,
          vy: randomBetween(-100, -56) * strength,
          life: randomBetween(0.22, 0.42),
          maxLife: randomBetween(0.22, 0.42),
          radius: randomBetween(0.7, 1.5),
          alpha: randomBetween(0.12, 0.22),
        });
      }
    }

    function drawDrop(drop: Drop) {
      const dx = (drop.speedX / drop.speedY) * drop.length;
      const dy = drop.length;
      const gradient = ctx.createLinearGradient(drop.x, drop.y, drop.x + dx, drop.y + dy);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(
        0.35,
        drop.kind === "sleet"
          ? `rgba(236,242,255,${Math.min(drop.alpha + 0.06, 0.45)})`
          : `rgba(220,235,255,${drop.alpha})`
      );
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.lineWidth = drop.thickness;
      ctx.lineCap = "round";
      ctx.strokeStyle = gradient;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + dx, drop.y + dy);
      ctx.stroke();
    }

    function drawFlake(flake: Flake) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(245,248,255,${flake.alpha})`;
      ctx.shadowColor = "rgba(255,255,255,0.25)";
      ctx.shadowBlur = 4;
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawSplash(splash: Splash) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(225,235,255,${splash.alpha * (splash.life / splash.maxLife)})`;
      ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function createLightningBolt(): LightningBolt {
      const startX = randomBetween(width * 0.18, width * 0.78);
      const endY = randomBetween(height * 0.32, height * 0.72);
      const segmentCount = 8 + Math.floor(Math.random() * 4);
      const points: LightningBolt["points"] = [];
      const branches: LightningBolt["branches"] = [];

      for (let i = 0; i <= segmentCount; i += 1) {
        const progress = i / segmentCount;
        points.push({
          x: startX + Math.sin(progress * Math.PI * 1.4) * 34 + randomBetween(-32, 32) * (0.35 + progress),
          y: progress * endY,
        });
      }

      for (let i = 2; i < points.length - 2; i += 2) {
        if (Math.random() > 0.72) continue;
        const origin = points[i];
        const direction = Math.random() > 0.5 ? 1 : -1;
        const branchLength = randomBetween(58, 135);
        const branchSegments = 2 + Math.floor(Math.random() * 3);
        const branch: LightningBolt["points"] = [{ ...origin }];

        for (let j = 1; j <= branchSegments; j += 1) {
          const progress = j / branchSegments;
          branch.push({
            x: origin.x + direction * branchLength * progress + randomBetween(-14, 14),
            y: origin.y + randomBetween(18, 54) * progress,
          });
        }

        branches.push(branch);
      }

      return {
        points,
        branches,
        life: 0.22,
        maxLife: 0.22,
        alpha: 0.92,
      };
    }

    function strokeLightningPath(points: LightningBolt["points"], alpha: number, widthMultiplier = 1) {
      if (points.length < 2) return;

      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = `rgba(190, 218, 255, ${alpha * 0.8})`;
      ctx.shadowBlur = 18 * widthMultiplier;
      ctx.strokeStyle = `rgba(185, 213, 255, ${alpha * 0.34})`;
      ctx.lineWidth = 8 * widthMultiplier;
      ctx.stroke();

      ctx.shadowBlur = 10 * widthMultiplier;
      ctx.strokeStyle = `rgba(232, 242, 255, ${alpha})`;
      ctx.lineWidth = 2.5 * widthMultiplier;
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    function drawLightningBolt(bolt: LightningBolt, delta: number) {
      const alpha = Math.max(0, bolt.alpha * (bolt.life / bolt.maxLife));
      strokeLightningPath(bolt.points, alpha, 1);
      bolt.branches.forEach((branch) => strokeLightningPath(branch, alpha * 0.74, 0.58));

      ctx.fillStyle = `rgba(190, 215, 255, ${alpha * 0.055})`;
      ctx.fillRect(0, 0, width, height);

      bolt.life -= delta;
      if (bolt.life <= 0) {
        lightningBolt = null;
      }
    }

    resize();

    for (let i = 0; i < rainCount; i += 1) {
      drops.push(createDrop(i, precipitation === "sleet" ? "sleet" : "rain"));
    }

    for (let i = 0; i < snowCount; i += 1) {
      flakes.push(createFlake(i));
    }

    function animate(timestamp: number) {
      if (!lastTime) lastTime = timestamp;
      const delta = Math.min((timestamp - lastTime) / 1000, 0.033);
      lastTime = timestamp;
      elapsed += delta;

      ctx.clearRect(0, 0, width, height);

      for (const drop of drops) {
        drop.x += drop.speedX * delta;
        drop.y += drop.speedY * delta;
        if (drop.y > height + drop.length || drop.x < -80) {
          if (drop.kind !== "sleet" && Math.random() < 0.45) {
            createSplash(drop.x, height - randomBetween(0, 8), intensity === "heavy" ? 1.08 : 0.9);
          }
          resetDrop(drop);
        }
        drawDrop(drop);
      }

      for (const flake of flakes) {
        flake.phase += delta * (wind === "windy" ? 2.8 : wind === "breezy" ? 2 : 1.3);
        flake.x += (flake.speedX + Math.sin(flake.phase) * flake.wobble) * delta;
        flake.y += flake.speedY * delta;
        if (flake.y > height + 10 || flake.x < -50 || flake.x > width + 50) {
          resetFlake(flake);
        }
        drawFlake(flake);
      }

      for (let i = splashes.length - 1; i >= 0; i -= 1) {
        const splash = splashes[i];
        splash.x += splash.vx * delta;
        splash.y += splash.vy * delta;
        splash.vy += 420 * delta;
        splash.life -= delta;
        if (splash.life <= 0) {
          splashes.splice(i, 1);
          continue;
        }
        drawSplash(splash);
      }

      if (thunder && elapsed >= lightningAt) {
        lightningBolt = createLightningBolt();
        lightningOpacity = 0.18;
        lightningAt = elapsed + Math.random() * 7 + 4;
      }

      if (lightningBolt) {
        drawLightningBolt(lightningBolt, delta);
      }

      if (lightningOpacity > 0) {
        ctx.fillStyle = `rgba(235, 242, 255, ${lightningOpacity})`;
        ctx.fillRect(0, 0, width, height);
        lightningOpacity = Math.max(0, lightningOpacity - delta * 3.8);
      }

      animationFrameId = window.requestAnimationFrame(animate);
    }

    const handleResize = () => {
      resize();
      drops.forEach(resetDrop);
      flakes.forEach((flake) => resetFlake(flake, false));
    };

    window.addEventListener("resize", handleResize);
    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [precipitation, wind, intensity, thunder]);

  const showCanvas = precipitation !== "none" || thunder;
  const showFog = sky === "foggy";
  const showClouds = sky === "cloudy" || sky === "partly_cloudy" || sky === "storm";
  const showSun = sky === "clear" || sky === "partly_cloudy";
  const showStars = scene.isNight;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div
          className="absolute inset-[-12%]"
          style={{
            background: `radial-gradient(circle at 22% 24%, ${palette.glowA}, transparent 34%)`,
            animation: "glowDriftA 26s ease-in-out infinite",
            filter: "blur(8px)",
          }}
        />
        <div
          className="absolute inset-[-14%]"
          style={{
            background: `radial-gradient(circle at 78% 22%, ${palette.glowB}, transparent 32%)`,
            animation: "glowDriftB 34s ease-in-out infinite",
            filter: "blur(10px)",
          }}
        />
        <div
          className="absolute inset-[-10%]"
          style={{
            background: `radial-gradient(circle at 52% 82%, ${palette.glowC}, transparent 40%)`,
            animation: "glowDriftC 42s ease-in-out infinite",
            filter: "blur(12px)",
          }}
        />
        <div
          className="absolute inset-[-8%] opacity-40"
          style={{
            background: `conic-gradient(from 180deg at 50% 50%, transparent 0deg, ${palette.glowA} 72deg, transparent 120deg, ${palette.glowB} 220deg, transparent 300deg, ${palette.glowC} 340deg, transparent 360deg)`,
            animation: "ambientSweep 56s linear infinite",
            filter: "blur(48px)",
            mixBlendMode: "screen",
          }}
        />
      </div>

      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.05), transparent 30%, transparent 70%, rgba(255,255,255,0.04))",
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9) 0 0.6px, transparent 0.8px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.8) 0 0.7px, transparent 0.9px), radial-gradient(circle at 40% 70%, rgba(255,255,255,0.7) 0 0.7px, transparent 1px)",
          backgroundSize: "180px 180px, 220px 220px, 260px 260px",
          animation: "grainDrift 48s linear infinite",
        }}
      />

      {showStars ? (
        <div className="pointer-events-none fixed inset-0 opacity-45">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.95) 0 0.7px, transparent 1px), radial-gradient(circle at 28% 36%, rgba(255,255,255,0.7) 0 0.6px, transparent 0.9px), radial-gradient(circle at 46% 16%, rgba(255,255,255,0.8) 0 0.7px, transparent 1px), radial-gradient(circle at 64% 32%, rgba(255,255,255,0.65) 0 0.6px, transparent 0.9px), radial-gradient(circle at 86% 20%, rgba(255,255,255,0.85) 0 0.7px, transparent 1px), radial-gradient(circle at 76% 58%, rgba(255,255,255,0.58) 0 0.6px, transparent 0.9px), radial-gradient(circle at 18% 72%, rgba(255,255,255,0.7) 0 0.7px, transparent 1px)",
              backgroundSize: "340px 260px, 420px 320px, 520px 380px, 460px 300px, 390px 310px, 560px 420px, 480px 360px",
              animation: "starDrift 90s linear infinite, starBreath 7s ease-in-out infinite",
            }}
          />
          <div className="absolute left-[8%] top-[12%] h-36 w-36 rounded-full bg-sky-200/[0.05] blur-3xl" />
        </div>
      ) : null}

      {showFog ? (
        <div className="pointer-events-none fixed inset-0 opacity-[0.76]">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(235,240,246,0.10),rgba(235,240,246,0.05)_36%,rgba(255,255,255,0.09)_70%,rgba(255,255,255,0.04))]" />
          <div className="absolute inset-x-[-18%] top-[10%] h-32 rounded-full bg-white/[0.16] blur-3xl animate-[fogDrift_22s_ease-in-out_infinite]" />
          <div className="absolute inset-x-[-16%] top-[32%] h-28 rounded-full bg-white/[0.13] blur-3xl animate-[fogDrift_28s_ease-in-out_infinite_reverse]" />
          <div className="absolute inset-x-[-22%] top-[43%] h-20 rounded-full bg-white/[0.11] blur-2xl animate-[fogDrift_24s_ease-in-out_infinite]" />
          <div className="absolute inset-x-[-20%] top-[52%] h-24 rounded-full bg-white/[0.12] blur-3xl animate-[fogDrift_30s_ease-in-out_infinite]" />
          <div className="absolute inset-x-[-18%] bottom-[12%] h-36 rounded-full bg-white/[0.12] blur-3xl animate-[fogDrift_34s_ease-in-out_infinite_reverse]" />
        </div>
      ) : null}

      {showClouds ? (
        <div className={`pointer-events-none fixed inset-0 ${sky === "storm" ? "opacity-[0.28]" : "opacity-20"}`}>
          <div className="absolute left-[-8%] top-[12%] h-24 w-[44%] rounded-full bg-white/[0.08] blur-3xl animate-[cloudDrift_34s_linear_infinite]" />
          <div className="absolute right-[-10%] top-[28%] h-28 w-[38%] rounded-full bg-white/[0.06] blur-3xl animate-[cloudDrift_44s_linear_infinite_reverse]" />
          {sky === "storm" ? <div className="absolute inset-x-[10%] top-[18%] h-24 rounded-full bg-black/[0.15] blur-3xl" /> : null}
        </div>
      ) : null}

      {showSun ? (
        <div className={`pointer-events-none fixed inset-0 ${sky === "partly_cloudy" ? "opacity-[0.12]" : "opacity-20"}`}>
          <div className="absolute left-[12%] top-[16%] h-40 w-40 rounded-full bg-white/10 blur-3xl animate-[sunPulse_12s_ease-in-out_infinite]" />
        </div>
      ) : null}

      {showCanvas ? (
        <>
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              background:
                precipitation === "rain" || precipitation === "sleet"
                  ? "linear-gradient(112deg, rgba(255,255,255,0.04), transparent 42%, transparent 74%, rgba(255,255,255,0.02))"
                  : "linear-gradient(112deg, rgba(255,255,255,0.03), transparent 42%, transparent 74%, rgba(255,255,255,0.015))",
              filter: "blur(12px)",
              opacity: precipitation === "rain" || precipitation === "sleet" ? 0.22 : 0.14,
            }}
          />
          <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />
        </>
      ) : null}

      <style>{`
        @keyframes glowDriftA {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.92; }
          50% { transform: translate3d(2.4%, 1.8%, 0) scale(1.08); opacity: 1; }
        }
        @keyframes glowDriftB {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.82; }
          50% { transform: translate3d(-2.8%, 2.2%, 0) scale(1.1); opacity: 0.98; }
        }
        @keyframes glowDriftC {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.78; }
          50% { transform: translate3d(1.8%, -2.4%, 0) scale(1.06); opacity: 0.92; }
        }
        @keyframes ambientSweep {
          0% { transform: rotate(0deg) scale(1.02); }
          50% { transform: rotate(180deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1.02); }
        }
        @keyframes grainDrift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-2.5%, 1.5%, 0); }
        }
        @keyframes starDrift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-1.2%, 0.8%, 0); }
        }
        @keyframes starBreath {
          0%, 100% { opacity: 0.58; }
          50% { opacity: 0.88; }
        }
        @keyframes fogDrift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4%); }
        }
        @keyframes cloudDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(12%); }
        }
        @keyframes sunPulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.08); }
        }
      `}</style>
    </>
  );
}
