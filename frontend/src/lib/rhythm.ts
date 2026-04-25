import type {
  Chronotype,
  RhythmFeeling,
  RhythmProfile,
  RhythmState,
  Section,
  SectionTitle,
  WeatherViewModel,
} from "../types/weather";

export const RHYTHM_PROFILE_KEY = "zen_rhythm_profile";
export const DEFAULT_RHYTHM_PROFILE: RhythmProfile = {
  chronotype: "unknown",
  rhythmState: "unknown",
  rhythmFeeling: "unstable",
  usualBedtime: "23:30",
  usualWake: "07:30",
  desiredWake: "07:00",
  weekdaySleepTime: "23:30",
  weekdayWakeTime: "07:30",
  weekendSleepTime: "00:30",
  weekendWakeTime: "08:30",
  createdAt: "",
  updatedAt: "",
};

export const RHYTHM_PHASES: SectionTitle[] = ["Morgen", "Fokus", "Pause", "Kveld", "Natt"];

export const RHYTHM_FEELING_OPTIONS: ReadonlyArray<{
  value: RhythmFeeling;
  title: string;
  description: string;
}> = [
  {
    value: "best_early",
    title: "Jeg fungerer best tidlig",
    description: "Morgen og tidlig dag kjennes lettest.",
  },
  {
    value: "best_later",
    title: "Jeg fungerer best sent",
    description: "Energi og klarhet kommer senere.",
  },
  {
    value: "tired_all_day",
    title: "Jeg er trøtt mye av tiden",
    description: "Det er vanskelig å lese kroppen akkurat nå.",
  },
  {
    value: "unstable",
    title: "Rytmen føles ustabil",
    description: "Søvn og energi flytter seg fra dag til dag.",
  },
  {
    value: "weekday_weekend_diff",
    title: "Hverdag og helg er veldig ulike",
    description: "Fri-dager og hverdager trekker rytmen i hver sin retning.",
  },
];

export type RhythmPlan = {
  chronotype: Chronotype;
  rhythmState: RhythmState;
  rhythmFeeling: RhythmFeeling;
  usualBedtimeMinutes: number;
  usualWakeMinutes: number;
  weekdaySleepMinutes: number;
  weekdayWakeMinutes: number;
  weekendSleepMinutes: number;
  weekendWakeMinutes: number;
  desiredWakeMinutes: number;
  suggestedBedtimeMinutes: number;
  suggestedWakeMinutes: number;
  nextBedtimeMinutes: number;
  nextWakeMinutes: number;
  sleepWindowMinutes: number;
  currentSleepWindowMinutes: number;
  adjustmentMinutes: number;
  adjustmentDirection: "earlier" | "later" | "stable";
  bedtimeLabel: string;
  wakeLabel: string;
  nextBedtimeLabel: string;
  nextWakeLabel: string;
  desiredWakeLabel: string;
  currentWindowLabel: string;
  targetWindowLabel: string;
  suggestionLabel: string;
  chronotypeLabel: string;
  rhythmStateLabel: string;
  rhythmFeelingLabel: string;
  systemFocusLabel: string;
  systemFocusText: string;
  weekdayWindowLabel: string;
  weekendWindowLabel: string;
  socialJetlagMinutes: number;
  socialJetlagLabel: string;
  feedback: string;
  isCircadianDrifted: boolean;
};

export type DayPhase = "morning" | "work" | "evening" | "night";

export type RhythmNudge = {
  id: string;
  phase: SectionTitle;
  title: string;
  text: string;
  microStep: string;
};

export type RhythmAnchor = {
  id: string;
  phase: SectionTitle;
  title: string;
  text: string;
  action: string;
};

export type RhythmSystemStep = {
  id: "stabilize" | "variability" | "consistency" | "personalize";
  title: string;
  text: string;
  active: boolean;
};

export type RhythmCalendarContext = {
  label: string;
  note: string;
  detail?: string;
  tone: "hverdag" | "helg" | "rodDag";
  holidayName?: string;
};

type PhaseWindow = {
  title: SectionTitle;
  start: number;
  end: number;
};

const MIN_GUIDED_SLEEP_MINUTES = 7 * 60;
const MAX_GUIDED_SLEEP_MINUTES = 9 * 60;
const EARLIEST_GUIDED_WAKE = 5 * 60 + 30;
const LATEST_GUIDED_WAKE = 10 * 60 + 30;
const MAX_DAILY_ADJUSTMENT_MINUTES = 15;
const SOCIAL_JETLAG_THRESHOLD_MINUTES = 75;

const legacyPhaseMap: Record<string, SectionTitle> = {
  Start: "Morgen",
  Morgen: "Morgen",
  Jobb: "Fokus",
  Fokus: "Fokus",
  Pause: "Pause",
  Nedtrapping: "Kveld",
  Kveld: "Kveld",
  Avkobling: "Natt",
  Natt: "Natt",
};

export function buildRhythmPlan(profile: RhythmProfile | null): RhythmPlan {
  const source = profile || DEFAULT_RHYTHM_PROFILE;
  const usualBedtimeMinutes = parseClockTime(source.usualBedtime) ?? parseClockTime(DEFAULT_RHYTHM_PROFILE.usualBedtime)!;
  const usualWakeMinutes = parseClockTime(source.usualWake) ?? parseClockTime(DEFAULT_RHYTHM_PROFILE.usualWake)!;
  const weekdaySleepMinutes = parseClockTime(source.weekdaySleepTime) ?? usualBedtimeMinutes;
  const weekdayWakeMinutes = parseClockTime(source.weekdayWakeTime) ?? usualWakeMinutes;
  const weekendSleepMinutes = parseClockTime(source.weekendSleepTime) ?? usualBedtimeMinutes;
  const weekendWakeMinutes = parseClockTime(source.weekendWakeTime) ?? usualWakeMinutes;
  const desiredWakeMinutes = parseClockTime(source.desiredWake) ?? parseClockTime(DEFAULT_RHYTHM_PROFILE.desiredWake)!;
  const currentSleepWindowMinutes = getForwardDuration(usualBedtimeMinutes, usualWakeMinutes) || 8 * 60;
  const sleepWindowMinutes = clampNumber(currentSleepWindowMinutes, MIN_GUIDED_SLEEP_MINUTES, MAX_GUIDED_SLEEP_MINUTES);
  const guidedWakeMinutes = clampWakeAnchor(desiredWakeMinutes);
  const guidedBedtimeMinutes = normalizeMinutes(guidedWakeMinutes - sleepWindowMinutes);
  const wakeDifference = getSignedClockDifference(usualWakeMinutes, guidedWakeMinutes);
  const bedtimeDifference = getSignedClockDifference(usualBedtimeMinutes, guidedBedtimeMinutes);
  const distance = Math.abs(wakeDifference);
  const adjustmentMinutes = distance <= 10 ? 0 : Math.min(distance, MAX_DAILY_ADJUSTMENT_MINUTES);
  const adjustmentDirection = adjustmentMinutes === 0 ? "stable" : wakeDifference < 0 ? "earlier" : "later";
  const nextWakeMinutes = moveTowardByStep(usualWakeMinutes, guidedWakeMinutes, adjustmentMinutes);
  const bedtimeStep = Math.abs(bedtimeDifference) <= 10 ? 0 : Math.min(Math.abs(bedtimeDifference), MAX_DAILY_ADJUSTMENT_MINUTES);
  const nextBedtimeMinutes = moveTowardByStep(usualBedtimeMinutes, guidedBedtimeMinutes, bedtimeStep);
  const isCircadianDrifted = distance > 90 || Math.abs(bedtimeDifference) > 90 || currentSleepWindowMinutes > MAX_GUIDED_SLEEP_MINUTES + 60;
  const socialJetlagMinutes = getSocialJetlagMinutes(weekdaySleepMinutes, weekdayWakeMinutes, weekendSleepMinutes, weekendWakeMinutes);
  const profileSignals = getProfileSignalsFromFeeling(source.rhythmFeeling || DEFAULT_RHYTHM_PROFILE.rhythmFeeling);
  const chronotype = isChronotype(source.chronotype) ? source.chronotype : profileSignals.chronotype;
  const rhythmFeeling = isRhythmFeeling(source.rhythmFeeling) ? source.rhythmFeeling : DEFAULT_RHYTHM_PROFILE.rhythmFeeling;
  const rhythmState = inferRhythmState(source.rhythmState, rhythmFeeling, distance, isCircadianDrifted, socialJetlagMinutes);
  const focus = getSystemFocus(rhythmState, socialJetlagMinutes, distance);

  return {
    chronotype,
    rhythmState,
    rhythmFeeling,
    usualBedtimeMinutes,
    usualWakeMinutes,
    weekdaySleepMinutes,
    weekdayWakeMinutes,
    weekendSleepMinutes,
    weekendWakeMinutes,
    desiredWakeMinutes,
    suggestedBedtimeMinutes: guidedBedtimeMinutes,
    suggestedWakeMinutes: guidedWakeMinutes,
    nextBedtimeMinutes,
    nextWakeMinutes,
    sleepWindowMinutes,
    currentSleepWindowMinutes,
    adjustmentMinutes,
    adjustmentDirection,
    bedtimeLabel: formatClockMinutes(guidedBedtimeMinutes),
    wakeLabel: formatClockMinutes(guidedWakeMinutes),
    nextBedtimeLabel: formatClockMinutes(nextBedtimeMinutes),
    nextWakeLabel: formatClockMinutes(nextWakeMinutes),
    desiredWakeLabel: formatClockMinutes(desiredWakeMinutes),
    currentWindowLabel: `${formatClockMinutes(usualBedtimeMinutes)}-${formatClockMinutes(usualWakeMinutes)}`,
    targetWindowLabel: `${formatClockMinutes(guidedBedtimeMinutes)}-${formatClockMinutes(guidedWakeMinutes)}`,
    suggestionLabel: buildSuggestionLabel(adjustmentMinutes, adjustmentDirection),
    chronotypeLabel: getChronotypeLabel(chronotype),
    rhythmStateLabel: getRhythmStateLabel(rhythmState),
    rhythmFeelingLabel: getRhythmFeelingLabel(rhythmFeeling),
    systemFocusLabel: focus.label,
    systemFocusText: focus.text,
    weekdayWindowLabel: `${formatClockMinutes(weekdaySleepMinutes)}-${formatClockMinutes(weekdayWakeMinutes)}`,
    weekendWindowLabel: `${formatClockMinutes(weekendSleepMinutes)}-${formatClockMinutes(weekendWakeMinutes)}`,
    socialJetlagMinutes,
    socialJetlagLabel: formatDurationLabel(socialJetlagMinutes),
    feedback: buildFeedback(distance, adjustmentDirection, isCircadianDrifted, guidedWakeMinutes !== desiredWakeMinutes, rhythmState),
    isCircadianDrifted,
  };
}

export function buildRhythmSections(plan: RhythmPlan, activeSectionTitle: SectionTitle): Section[] {
  const windows = buildPhaseWindows(plan);
  const stabilizing = plan.rhythmState === "unstable" || plan.rhythmState === "social_jetlag";
  const copy: Record<SectionTitle, Pick<Section, "mantra" | "prompt">> = {
    Morgen: {
      mantra: stabilizing ? "Stabiliser først." : "Start mykt.",
      prompt: stabilizing ? "Lys først, tempo etterpå." : "Lys, vann og litt plass før tempo.",
    },
    Fokus: {
      mantra: "Bruk energien rolig.",
      prompt: "Én tydelig ting er nok å begynne med.",
    },
    Pause: {
      mantra: "Reset uten skyld.",
      prompt: "Et par minutter luft kan være nok.",
    },
    Kveld: {
      mantra: "La dagen slippe taket.",
      prompt: `Sikt mot ${plan.bedtimeLabel}, med små steg.`,
    },
    Natt: {
      mantra: "Resten kan vente.",
      prompt: "Demp lys, press og inntrykk.",
    },
  };

  return windows.map((window) => ({
    title: window.title,
    time: formatWindow(window.start, window.end),
    mantra: copy[window.title].mantra,
    prompt: copy[window.title].prompt,
    status: getPhaseStatus(window.title, activeSectionTitle),
  }));
}

export function buildDailyNudges(plan: RhythmPlan, activeSectionTitle: SectionTitle, weather?: WeatherViewModel): RhythmNudge[] {
  const weatherLightHint = getWeatherLightHint(weather);

  return [
    {
      id: "morning-light",
      phase: "Morgen",
      title: activeSectionTitle === "Morgen" ? "Nå" : "Morgen",
      text: `${getCircadianMessage("morning", plan, weather)} ${weatherLightHint}`,
      microStep: plan.isCircadianDrifted ? "Trekk gardinene til side når du våkner." : "Få dagslys innen første våkne time.",
    },
    {
      id: "day-energy",
      phase: activeSectionTitle === "Pause" ? "Pause" : "Fokus",
      title: activeSectionTitle === "Pause" ? "Reset" : "Dag",
      text: getCircadianMessage("work", plan, weather),
      microStep: activeSectionTitle === "Pause" ? "Ta to rolige minutter uten å fylle dem." : "Velg én ting før du åpner resten.",
    },
    {
      id: "evening-downshift",
      phase: "Kveld",
      title: "Kveld",
      text: plan.isCircadianDrifted
        ? `${getCircadianMessage("evening", plan, weather)} Første kveldssteg er rundt ${plan.nextBedtimeLabel}.`
        : `${getCircadianMessage("evening", plan, weather)} Demp lys rundt ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.`,
      microStep: "Demp ett lys eller legg bort én skjerm.",
    },
  ];
}

export function buildRhythmAnchors(plan: RhythmPlan, activeSectionTitle: SectionTitle, weather?: WeatherViewModel): RhythmAnchor[] {
  const weatherLightHint = getWeatherLightHint(weather);
  const anchors: RhythmAnchor[] = [
    {
      id: "light-anchor",
      phase: "Morgen",
      title: "Lysanker",
      text: weatherLightHint,
      action: plan.isCircadianDrifted ? "Få dagslys når du faktisk våkner." : `Få dagslys rundt ${plan.nextWakeLabel}.`,
    },
    {
      id: "energy-anchor",
      phase: activeSectionTitle === "Pause" ? "Pause" : "Fokus",
      title: activeSectionTitle === "Pause" ? "Resetanker" : "Fokusanker",
      text: "Jevn energi er bedre enn å presse gjennom alt på én gang.",
      action: activeSectionTitle === "Pause" ? "Ta en kort pause før neste ting." : "Velg én viktig ting og gjør den mindre.",
    },
    {
      id: "dim-anchor",
      phase: "Kveld",
      title: "Lys ned",
      text: "Lavere lys gjør overgangen til søvn lettere for kroppen.",
      action: `Demp ett lys før ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.`,
    },
    {
      id: "dark-anchor",
      phase: "Natt",
      title: "Mørkeanker",
      text: "Mørke beskytter rytmen når kroppen prøver å lande.",
      action: "Hold skjermen lav, eller legg den bort i noen minutter.",
    },
  ];

  return anchors.sort((a, b) => Number(b.phase === activeSectionTitle) - Number(a.phase === activeSectionTitle));
}

export function buildRhythmSystemSteps(plan: RhythmPlan): RhythmSystemStep[] {
  const activeId = getSystemStepId(plan.systemFocusLabel);

  return [
    {
      id: "stabilize",
      title: "Stabiliser",
      text: "Færre hopp fra dag til dag.",
      active: activeId === "stabilize",
    },
    {
      id: "variability",
      title: "Variasjon",
      text: "Mykere forskjell mellom hverdag og fri.",
      active: activeId === "variability",
    },
    {
      id: "consistency",
      title: "Konsistens",
      text: "Lys og våkning får et roligere mønster.",
      active: activeId === "consistency",
    },
    {
      id: "personalize",
      title: "Personlig rytme",
      text: "Kronotype tolkes forsiktig senere.",
      active: activeId === "personalize",
    },
  ];
}

export function getCircadianMessage(phase: DayPhase, profile: Pick<RhythmPlan, "chronotype" | "rhythmState">, weather?: WeatherViewModel) {
  const { chronotype, rhythmState } = profile;

  if (phase === "morning") {
    if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
      return "Morgener kan kjennes tunge når rytmen flytter på seg. Start mykt, få lys, og ta ett lite steg.";
    }

    if (rhythmState === "delayed") {
      return "Rytmen ligger senere akkurat nå. Lys tidlig på dagen hjelper kroppen å finne retning.";
    }

    if (chronotype === "evening") {
      return "Rytmen din kan naturlig ligge litt senere. Hold morgenen myk og enkel.";
    }

    return "Gi kroppen en rolig start. Lys, vann og én liten handling hjelper.";
  }

  if (phase === "work") {
    if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
      return "Når rytmen er ustabil, er jevn energi viktigere enn mye energi. Velg én ting og legg inn en kort pause.";
    }

    return "Dette er en god fase for fokus. Velg én ting som hjelper dagen.";
  }

  if (phase === "evening") {
    const weatherLine = weather && weather.temperature !== null && weather.temperature < 2 ? "Frisk luft kan være kort og enkel." : "";
    return `Senk lys og tempo. Lavere lys forteller kroppen at dagen kan slippe taket.${weatherLine ? ` ${weatherLine}` : ""}`;
  }

  return "Nå trenger kroppen mørke og ro. Hold det enkelt, mørkt og uten forventning.";
}

export function getCurrentRhythmPhase(date: Date, plan: RhythmPlan): SectionTitle {
  const minute = getCycleMinute(date, plan);
  const window = buildPhaseWindows(plan).find((phaseWindow) => minute >= phaseWindow.start && minute < phaseWindow.end);
  return window?.title || "Natt";
}

export function getRhythmProgress(date: Date, plan: RhythmPlan) {
  const minute = getCycleMinute(date, plan);
  return clampNumber(((minute - plan.suggestedWakeMinutes) / 1440) * 100, 0, 100);
}

export function getPhasePreviewDate(now: Date, phase: SectionTitle | null, plan: RhythmPlan) {
  if (!phase) return now;

  const window = buildPhaseWindows(plan).find((phaseWindow) => phaseWindow.title === phase);
  if (!window) return now;

  const previewMinutes = normalizeMinutes(window.start + Math.min(45, Math.max(15, Math.round((window.end - window.start) / 2))));
  const preview = new Date(now);
  preview.setHours(Math.floor(previewMinutes / 60), previewMinutes % 60, 0, 0);
  return preview;
}

export function getPhaseState(sectionTitle: SectionTitle, activeSectionTitle: SectionTitle) {
  const sectionIndex = RHYTHM_PHASES.indexOf(sectionTitle);
  const activeIndex = RHYTHM_PHASES.indexOf(activeSectionTitle);

  if (sectionIndex === activeIndex) return "active";
  if (sectionIndex < activeIndex) return "complete";
  return "future";
}

export function getPhaseStatus(sectionTitle: SectionTitle, activeSectionTitle: SectionTitle) {
  const state = getPhaseState(sectionTitle, activeSectionTitle);

  if (state === "active") return "Nå";
  if (state === "complete") return "Ferdig";
  return "Senere";
}

export function getRhythmCalendarContext(date: Date, plan?: Pick<RhythmPlan, "socialJetlagMinutes" | "socialJetlagLabel">): RhythmCalendarContext {
  const socialJetlagDetail =
    plan && plan.socialJetlagMinutes >= SOCIAL_JETLAG_THRESHOLD_MINUTES
      ? `Ukedag og helg skiller ca. ${plan.socialJetlagLabel}. Det er vanlig, men kan forvirre kroppen litt. Små ankre hjelper over tid.`
      : undefined;
  const holidayName = getNorwegianHolidayName(date);
  if (holidayName) {
    return {
      label: "Rød dag",
      note: `${holidayName}. Zen kan tåle senere start og mykere forventninger.`,
      detail: socialJetlagDetail,
      tone: "rodDag",
      holidayName,
    };
  }

  const day = date.getDay();
  if (day === 0 || day === 6) {
    return {
      label: "Helg",
      note: socialJetlagDetail || "Helgerytmen kan være løsere, men ankeret bør fortsatt være snilt.",
      detail: socialJetlagDetail ? "Prøv å beholde ett mykt morgenanker også på fridager." : undefined,
      tone: "helg",
    };
  }

  return {
    label: "Ukedag",
    note: "Vanlig ukedag. Små justeringer fungerer best når de er lette å gjenta.",
    detail: socialJetlagDetail,
    tone: "hverdag",
  };
}

export function normalizeSectionTitle(value: unknown): SectionTitle | null {
  if (typeof value !== "string") return null;
  if (RHYTHM_PHASES.includes(value as SectionTitle)) return value as SectionTitle;
  return legacyPhaseMap[value] || null;
}

export function isValidClockTime(value: string) {
  return parseClockTime(value) !== null;
}

export function parseClockTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function formatClockMinutes(value: number) {
  const minutes = normalizeMinutes(value);
  const hoursPart = Math.floor(minutes / 60).toString().padStart(2, "0");
  const minutesPart = (minutes % 60).toString().padStart(2, "0");
  return `${hoursPart}:${minutesPart}`;
}

export function getProfileSignalsFromFeeling(feeling: RhythmFeeling): Pick<RhythmProfile, "chronotype" | "rhythmState"> {
  if (feeling === "best_early") {
    return { chronotype: "morning", rhythmState: "stable" };
  }

  if (feeling === "best_later") {
    return { chronotype: "evening", rhythmState: "stable" };
  }

  if (feeling === "weekday_weekend_diff") {
    return { chronotype: "unknown", rhythmState: "social_jetlag" };
  }

  if (feeling === "tired_all_day") {
    return { chronotype: "unknown", rhythmState: "unstable" };
  }

  return { chronotype: "unknown", rhythmState: "unstable" };
}

export function getChronotypeLabel(chronotype: Chronotype) {
  const labels: Record<Chronotype, string> = {
    morning: "Tidlig tendens",
    intermediate: "Midt imellom",
    evening: "Sen tendens",
    unknown: "Ikke tolket ennå",
  };

  return labels[chronotype];
}

export function getRhythmStateLabel(rhythmState: RhythmState) {
  const labels: Record<RhythmState, string> = {
    stable: "Stabil",
    slightly_shifted: "Litt forskjøvet",
    delayed: "Forsinket",
    unstable: "Ustabil",
    social_jetlag: "Hverdag/helg-sprik",
    unknown: "Uavklart",
  };

  return labels[rhythmState];
}

export function getRhythmFeelingLabel(feeling: RhythmFeeling) {
  return RHYTHM_FEELING_OPTIONS.find((option) => option.value === feeling)?.title || "Rytmen føles uavklart";
}

function buildPhaseWindows(plan: RhythmPlan): PhaseWindow[] {
  const wake = plan.suggestedWakeMinutes;
  const cycleEnd = wake + 1440;
  const bedtime = alignAfter(plan.suggestedBedtimeMinutes, wake);
  const startEnd = wake + 120;
  const focusEnd = wake + 420;
  const taperStart = clampNumber(bedtime - 180, wake + 600, cycleEnd - 300);
  const unwindStart = clampNumber(bedtime - 60, taperStart + 60, cycleEnd - 90);

  return [
    { title: "Morgen", start: wake, end: startEnd },
    { title: "Fokus", start: startEnd, end: focusEnd },
    { title: "Pause", start: focusEnd, end: taperStart },
    { title: "Kveld", start: taperStart, end: unwindStart },
    { title: "Natt", start: unwindStart, end: cycleEnd },
  ];
}

function getCycleMinute(date: Date, plan: RhythmPlan) {
  const minute = date.getHours() * 60 + date.getMinutes();
  return minute < plan.suggestedWakeMinutes ? minute + 1440 : minute;
}

function alignAfter(value: number, start: number) {
  return value < start ? value + 1440 : value;
}

function getForwardDuration(start: number, end: number) {
  return normalizeMinutes(end - start);
}

function clampWakeAnchor(minutes: number) {
  const earlyDistance = Math.abs(getSignedClockDifference(minutes, EARLIEST_GUIDED_WAKE));
  const lateDistance = Math.abs(getSignedClockDifference(minutes, LATEST_GUIDED_WAKE));

  if (minutes < EARLIEST_GUIDED_WAKE || minutes > LATEST_GUIDED_WAKE) {
    return earlyDistance < lateDistance ? EARLIEST_GUIDED_WAKE : LATEST_GUIDED_WAKE;
  }

  return minutes;
}

function moveTowardByStep(from: number, to: number, step: number) {
  if (step <= 0) return from;

  const difference = getSignedClockDifference(from, to);
  if (Math.abs(difference) <= step) return to;

  return normalizeMinutes(from + (difference < 0 ? -step : step));
}

function getSignedClockDifference(from: number, to: number) {
  let difference = to - from;
  if (difference > 720) difference -= 1440;
  if (difference < -720) difference += 1440;
  return difference;
}

function getSocialJetlagMinutes(weekdaySleep: number, weekdayWake: number, weekendSleep: number, weekendWake: number) {
  const weekdayMidpoint = getSleepMidpoint(weekdaySleep, weekdayWake);
  const weekendMidpoint = getSleepMidpoint(weekendSleep, weekendWake);
  const midpointDifference = Math.abs(getSignedClockDifference(weekdayMidpoint, weekendMidpoint));
  const wakeDifference = Math.abs(getSignedClockDifference(weekdayWake, weekendWake));

  return Math.round(Math.max(midpointDifference, wakeDifference));
}

function getSleepMidpoint(bedtime: number, wake: number) {
  return normalizeMinutes(bedtime + getForwardDuration(bedtime, wake) / 2);
}

function inferRhythmState(
  savedState: RhythmState | undefined,
  feeling: RhythmFeeling,
  distance: number,
  isCircadianDrifted: boolean,
  socialJetlagMinutes: number
): RhythmState {
  const signals = getProfileSignalsFromFeeling(feeling);

  if (socialJetlagMinutes >= SOCIAL_JETLAG_THRESHOLD_MINUTES || signals.rhythmState === "social_jetlag") return "social_jetlag";
  if (signals.rhythmState === "unstable") return "unstable";
  if (isCircadianDrifted) return "delayed";
  if (distance > 30) return "slightly_shifted";
  if (isRhythmState(savedState) && savedState !== "unknown") return savedState;
  return signals.rhythmState === "unknown" ? "stable" : signals.rhythmState;
}

function getSystemFocus(rhythmState: RhythmState, socialJetlagMinutes: number, distance: number) {
  if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
    return {
      label: "Stabiliser først",
      text: "Zen prioriterer jevnere ankre før appen prøver å tolke kronotype.",
    };
  }

  if (socialJetlagMinutes >= 45 || distance > 30) {
    return {
      label: "Reduser variasjon",
      text: "Små forskjeller fra dag til dag betyr mer enn perfekte kvelder.",
    };
  }

  if (rhythmState === "slightly_shifted" || rhythmState === "delayed") {
    return {
      label: "Introduser konsistens",
      text: "Hold morgenlyset og våknetiden litt mer like, så kan rytmen flytte seg.",
    };
  }

  return {
    label: "Personaliser forsiktig",
    text: "Når rytmen er roligere, kan Zen lese mønsteret mer presist.",
  };
}

function getSystemStepId(label: string): RhythmSystemStep["id"] {
  if (label === "Stabiliser først") return "stabilize";
  if (label === "Reduser variasjon") return "variability";
  if (label === "Introduser konsistens") return "consistency";
  return "personalize";
}

function getWeatherLightHint(weather?: WeatherViewModel) {
  if (!weather) return "Lys forteller kroppen at dagen har startet.";

  const code = weather.symbolCode.toLowerCase();
  if (weather.temperature !== null && weather.temperature <= 0) {
    return "Frisk luft hjelper fortsatt, selv om turen er kort.";
  }

  if (code.includes("clearsky") || code.includes("fair")) {
    return "Lyset er sterkt i dag; noen minutter ute hjelper rytmen.";
  }

  if (code.includes("cloudy") || code.includes("fog")) {
    return "Selv grått dagslys hjelper kroppen å forstå dag.";
  }

  if (code.includes("rain") || code.includes("sleet") || code.includes("snow")) {
    return "En rolig dag teller fortsatt; et lyst vindu er bedre enn ingenting.";
  }

  return "Lys forteller kroppen at dagen har startet.";
}

function isChronotype(value: unknown): value is Chronotype {
  return value === "morning" || value === "intermediate" || value === "evening" || value === "unknown";
}

function isRhythmFeeling(value: unknown): value is RhythmFeeling {
  return RHYTHM_FEELING_OPTIONS.some((option) => option.value === value);
}

function isRhythmState(value: unknown): value is RhythmState {
  return value === "stable" || value === "slightly_shifted" || value === "delayed" || value === "unstable" || value === "social_jetlag" || value === "unknown";
}

function buildSuggestionLabel(adjustmentMinutes: number, direction: RhythmPlan["adjustmentDirection"]) {
  if (direction === "stable") return "Hold rytmen rolig stabil";
  return `${adjustmentMinutes} min ${direction === "earlier" ? "tidligere" : "senere"}`;
}

function buildFeedback(
  distance: number,
  direction: RhythmPlan["adjustmentDirection"],
  isCircadianDrifted: boolean,
  desiredWakeWasClamped: boolean,
  rhythmState: RhythmState
) {
  if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
    return "La oss stabilisere først. Rytmen er ikke ødelagt; den trenger bare færre hopp og et mildt morgenanker.";
  }

  if (isCircadianDrifted) {
    return desiredWakeWasClamped
      ? "Rytmen ligger utenfor biologisk dag/natt. Zen bruker dagslys og et mildt morgenanker som retning, ikke som en hard regel."
      : "Rytmen ligger langt ute av sync. Zen speiler ikke det som en normal dag, men viser en myk vei tilbake mot ønsket morgen.";
  }

  if (distance <= 15) {
    return "Rytmen din er allerede nær ønsket start. Nå handler det mest om å holde den myk og stabil.";
  }

  if (direction === "earlier") {
    return "Vi flytter rytmen litt tidligere, uten brå rykk eller krav om perfekt kveld.";
  }

  return "Vi gir kroppen litt mer rom om morgenen, og lar rytmen finne et snillere feste.";
}

function formatDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return `${hours} t`;
  return `${hours} t ${rest} min`;
}

function formatWindow(start: number, end: number) {
  return `ca. ${formatClockMinutes(start)}-${formatClockMinutes(end)}`;
}

function normalizeMinutes(value: number) {
  return ((Math.round(value) % 1440) + 1440) % 1440;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNorwegianHolidayName(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const fixed = new Map([
    ["1-1", "Første nyttårsdag"],
    ["5-1", "Arbeidernes dag"],
    ["5-17", "Grunnlovsdagen"],
    ["12-25", "Første juledag"],
    ["12-26", "Andre juledag"],
  ]);
  const fixedName = fixed.get(`${month}-${day}`);
  if (fixedName) return fixedName;

  const easter = getEasterSunday(year);
  const movable = new Map([
    [-3, "Skjærtorsdag"],
    [-2, "Langfredag"],
    [0, "Første påskedag"],
    [1, "Andre påskedag"],
    [39, "Kristi himmelfartsdag"],
    [49, "Første pinsedag"],
    [50, "Andre pinsedag"],
  ]);

  for (const [offset, name] of movable.entries()) {
    const holiday = addDays(easter, offset);
    if (holiday.getMonth() + 1 === month && holiday.getDate() === day) {
      return name;
    }
  }

  return "";
}

function getEasterSunday(year: number) {
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
