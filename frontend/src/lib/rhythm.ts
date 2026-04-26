import type {
  Chronotype,
  DayPhase,
  DayType,
  HolidayInfo,
  LifeArea,
  RhythmFeeling,
  RhythmProfile,
  RhythmState,
  Section,
  SectionTitle,
  SupportedLanguage,
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

export const RHYTHM_PHASES: SectionTitle[] = ["Morgen", "Dag", "Ettermiddag", "Kveld", "Natt"];

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
  tone: DayType;
  holidayName?: string;
};

type PhaseWindow = {
  phase: DayPhase;
  title: SectionTitle;
  start: number;
  end: number;
};

type RhythmCalendarOptions = {
  dayType?: DayType;
  holiday?: HolidayInfo | null;
  language?: SupportedLanguage;
  holidayAwarenessEnabled?: boolean;
};

const MIN_GUIDED_SLEEP_MINUTES = 7 * 60;
const MAX_GUIDED_SLEEP_MINUTES = 9 * 60;
const EARLIEST_GUIDED_WAKE = 5 * 60 + 30;
const LATEST_GUIDED_WAKE = 10 * 60 + 30;
const MAX_DAILY_ADJUSTMENT_MINUTES = 15;
const SOCIAL_JETLAG_THRESHOLD_MINUTES = 75;
const PHASE_DAY_START_MINUTES = 6 * 60;
const FIXED_PHASE_WINDOWS: PhaseWindow[] = [
  { phase: "morning", title: "Morgen", start: 6 * 60, end: 9 * 60 },
  { phase: "day", title: "Dag", start: 9 * 60, end: 12 * 60 },
  { phase: "afternoon", title: "Ettermiddag", start: 12 * 60, end: 18 * 60 },
  { phase: "evening", title: "Kveld", start: 18 * 60, end: 24 * 60 },
  { phase: "night", title: "Natt", start: 24 * 60, end: 30 * 60 },
];

const legacyPhaseMap: Record<string, SectionTitle> = {
  Start: "Morgen",
  Morgen: "Morgen",
  Jobb: "Dag",
  Fokus: "Dag",
  Dag: "Dag",
  Pause: "Ettermiddag",
  Reset: "Ettermiddag",
  Ettermiddag: "Ettermiddag",
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

export function buildRhythmSections(plan: RhythmPlan, activeSectionTitle: SectionTitle, dayType: DayType = "weekday", language: SupportedLanguage = "no"): Section[] {
  const windows = buildPhaseWindows();
  const stabilizing = plan.rhythmState === "unstable" || plan.rhythmState === "social_jetlag";
  const freeDay = dayType === "weekend" || dayType === "free_day";
  const copy: Record<SupportedLanguage, Record<SectionTitle, Pick<Section, "mantra" | "prompt">>> = {
    no: {
      Morgen: {
        mantra: freeDay ? "Start fritt." : stabilizing ? "Stabiliser først." : "Start mykt.",
        prompt: freeDay ? "Lys og én rolig start kan holde rytmen i live." : stabilizing ? "Lys først, tempo etterpå." : "Lys, vann og litt plass før tempo.",
      },
      Dag: {
        mantra: freeDay ? "Ha litt kontakt med formiddagen." : "Møt formiddagen rolig.",
        prompt: freeDay ? "Formiddagen kan være fri, med ett lite rytmeanker." : "Kontakt, fokus og ett tydelig valg er nok.",
      },
      Ettermiddag: {
        mantra: "Dagen kan justeres.",
        prompt: "Ettermiddagen kan være en ny liten start.",
      },
      Kveld: {
        mantra: "La dagen slippe taket.",
        prompt: `Sikt mot ${plan.bedtimeLabel}, med små steg.`,
      },
      Natt: {
        mantra: "Resten kan vente.",
        prompt: "Demp lys, press og inntrykk.",
      },
    },
    en: {
      Morgen: {
        mantra: freeDay ? "Start freely." : stabilizing ? "Stabilize first." : "Start softly.",
        prompt: freeDay ? "Light and one gentle start can keep the rhythm alive." : stabilizing ? "Light first, pace after." : "Light, water, and a little space before speed.",
      },
      Dag: {
        mantra: freeDay ? "Stay in touch with the late morning." : "Meet the late morning gently.",
        prompt: freeDay ? "A free day can stay free, with one small rhythm anchor." : "Contact, focus, and one clear choice are enough.",
      },
      Ettermiddag: {
        mantra: "The day can adjust.",
        prompt: "Afternoon can be a small new start.",
      },
      Kveld: {
        mantra: "Let the day loosen its grip.",
        prompt: `Aim toward ${plan.bedtimeLabel}, in small steps.`,
      },
      Natt: {
        mantra: "The rest can wait.",
        prompt: "Dim light, pressure, and impressions.",
      },
    },
  };

  return windows.map((window) => ({
    phase: window.phase,
    title: window.title,
    time: formatWindow(window.start, window.end, language),
    mantra: copy[language][window.title].mantra,
    prompt: copy[language][window.title].prompt,
    status: getPhaseStatus(window.title, activeSectionTitle),
  }));
}

export function buildDailyNudges(
  plan: RhythmPlan,
  activeSectionTitle: SectionTitle,
  weather?: WeatherViewModel,
  selectedLifeAreas: LifeArea[] = ["energy", "sleep", "mood"],
  dayType: DayType = "weekday",
  language: SupportedLanguage = "no"
): RhythmNudge[] {
  const weatherLightHint = getWeatherLightHint(weather, language);
  const labels = {
    now: language === "en" ? "Now" : "Nå",
    morning: language === "en" ? "Morning" : "Morgen",
    day: language === "en" ? "Late morning" : "Formiddag",
    adjust: language === "en" ? "Adjust" : "Juster",
    evening: language === "en" ? "Evening" : "Kveld",
  };

  return [
    {
      id: "morning-light",
      phase: "Morgen",
      title: activeSectionTitle === "Morgen" ? labels.now : labels.morning,
      text: `${getCircadianMessage("morning", plan, weather, language)} ${weatherLightHint}`,
      microStep:
        getLifeAreaMicroStep("morning", selectedLifeAreas, dayType, language) ||
        (language === "en"
          ? plan.isCircadianDrifted
            ? "Open the curtains when you wake."
            : "Get daylight within the first waking hour."
          : plan.isCircadianDrifted
            ? "Trekk gardinene til side når du våkner."
            : "Få dagslys innen første våkne time."),
    },
    {
      id: "day-energy",
      phase: activeSectionTitle === "Ettermiddag" ? "Ettermiddag" : "Dag",
      title: activeSectionTitle === "Ettermiddag" ? labels.adjust : labels.day,
      text: getCircadianMessage(activeSectionTitle === "Ettermiddag" ? "afternoon" : "day", plan, weather, language),
      microStep:
        getLifeAreaMicroStep(activeSectionTitle === "Ettermiddag" ? "afternoon" : "day", selectedLifeAreas, dayType, language) ||
        (language === "en"
          ? activeSectionTitle === "Ettermiddag"
            ? "Take two quiet minutes without filling them."
            : "Choose one thing before opening the rest."
          : activeSectionTitle === "Ettermiddag"
            ? "Ta to rolige minutter uten å fylle dem."
            : "Velg én ting før du åpner resten."),
    },
    {
      id: "evening-downshift",
      phase: "Kveld",
      title: labels.evening,
      text: plan.isCircadianDrifted
        ? `${getCircadianMessage("evening", plan, weather, language)} ${
            language === "en" ? `The first evening step is around ${plan.nextBedtimeLabel}.` : `Første kveldssteg er rundt ${plan.nextBedtimeLabel}.`
          }`
        : `${getCircadianMessage("evening", plan, weather, language)} ${
            language === "en" ? `Dim light around ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.` : `Demp lys rundt ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.`
          }`,
      microStep: getLifeAreaMicroStep("evening", selectedLifeAreas, dayType, language) || (language === "en" ? "Dim one light or put away one screen." : "Demp ett lys eller legg bort én skjerm."),
    },
  ];
}

export function buildRhythmAnchors(plan: RhythmPlan, activeSectionTitle: SectionTitle, weather?: WeatherViewModel, language: SupportedLanguage = "no"): RhythmAnchor[] {
  const weatherLightHint = getWeatherLightHint(weather, language);
  const anchors: RhythmAnchor[] = [
    {
      id: "light-anchor",
      phase: "Morgen",
      title: language === "en" ? "Light anchor" : "Lysanker",
      text: weatherLightHint,
      action:
        language === "en"
          ? plan.isCircadianDrifted
            ? "Get daylight when you actually wake."
            : `Get daylight around ${plan.nextWakeLabel}.`
          : plan.isCircadianDrifted
            ? "Få dagslys når du faktisk våkner."
            : `Få dagslys rundt ${plan.nextWakeLabel}.`,
    },
    {
      id: "energy-anchor",
      phase: activeSectionTitle === "Ettermiddag" ? "Ettermiddag" : "Dag",
      title: language === "en" ? (activeSectionTitle === "Ettermiddag" ? "Reset anchor" : "Late-morning anchor") : activeSectionTitle === "Ettermiddag" ? "Resetanker" : "Formiddagsanker",
      text: language === "en" ? "Steady energy is better than pushing through everything at once." : "Jevn energi er bedre enn å presse gjennom alt på én gang.",
      action:
        language === "en"
          ? activeSectionTitle === "Ettermiddag"
            ? "Take a short pause before the next thing."
            : "Choose one important thing and make it smaller."
          : activeSectionTitle === "Ettermiddag"
            ? "Ta en kort pause før neste ting."
            : "Velg én viktig ting og gjør den mindre.",
    },
    {
      id: "dim-anchor",
      phase: "Kveld",
      title: language === "en" ? "Lower light" : "Lys ned",
      text: language === "en" ? "Lower light makes the transition toward sleep easier for the body." : "Lavere lys gjør overgangen til søvn lettere for kroppen.",
      action: language === "en" ? `Dim one light before ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.` : `Demp ett lys før ${formatClockMinutes(plan.suggestedBedtimeMinutes - 60)}.`,
    },
    {
      id: "dark-anchor",
      phase: "Natt",
      title: language === "en" ? "Dark anchor" : "Mørkeanker",
      text: language === "en" ? "Darkness protects rhythm when the body is trying to land." : "Mørke beskytter rytmen når kroppen prøver å lande.",
      action: language === "en" ? "Keep the screen low, or put it away for a few minutes." : "Hold skjermen lav, eller legg den bort i noen minutter.",
    },
  ];

  return anchors.sort((a, b) => Number(b.phase === activeSectionTitle) - Number(a.phase === activeSectionTitle));
}

export function buildRhythmSystemSteps(plan: RhythmPlan, language: SupportedLanguage = "no"): RhythmSystemStep[] {
  const activeId = getSystemStepId(plan.systemFocusLabel);
  const copy: Record<SupportedLanguage, Record<RhythmSystemStep["id"], Pick<RhythmSystemStep, "title" | "text">>> = {
    no: {
      stabilize: { title: "Stabiliser", text: "Færre hopp fra dag til dag." },
      variability: { title: "Variasjon", text: "Mykere forskjell mellom hverdag og fri." },
      consistency: { title: "Konsistens", text: "Lys og våkning får et roligere mønster." },
      personalize: { title: "Personlig rytme", text: "Kronotype tolkes forsiktig senere." },
    },
    en: {
      stabilize: { title: "Stabilize", text: "Fewer jumps from day to day." },
      variability: { title: "Variation", text: "Softer difference between workdays and free days." },
      consistency: { title: "Consistency", text: "Light and wake time get a calmer pattern." },
      personalize: { title: "Personal rhythm", text: "Chronotype is read carefully later." },
    },
  };

  return [
    {
      id: "stabilize",
      ...copy[language].stabilize,
      active: activeId === "stabilize",
    },
    {
      id: "variability",
      ...copy[language].variability,
      active: activeId === "variability",
    },
    {
      id: "consistency",
      ...copy[language].consistency,
      active: activeId === "consistency",
    },
    {
      id: "personalize",
      ...copy[language].personalize,
      active: activeId === "personalize",
    },
  ];
}

export function getCircadianMessage(phase: DayPhase, profile: Pick<RhythmPlan, "chronotype" | "rhythmState">, weather?: WeatherViewModel, language: SupportedLanguage = "no") {
  const { chronotype, rhythmState } = profile;

  if (phase === "morning") {
    if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
      return language === "en"
        ? "Mornings can feel heavy when rhythm is shifting. Start gently, get light, and take one small step."
        : "Morgener kan kjennes tunge når rytmen flytter på seg. Start mykt, få lys, og ta ett lite steg.";
    }

    if (rhythmState === "delayed") {
      return language === "en"
        ? "The rhythm is running later right now. Early daylight helps the body find direction."
        : "Rytmen ligger senere akkurat nå. Lys tidlig på dagen hjelper kroppen å finne retning.";
    }

    if (chronotype === "evening") {
      return language === "en"
        ? "Your rhythm may naturally run a little later. Keep the morning soft and simple."
        : "Rytmen din kan naturlig ligge litt senere. Hold morgenen myk og enkel.";
    }

    return language === "en" ? "Give the body a calm start. Light, water, and one small action help." : "Gi kroppen en rolig start. Lys, vann og én liten handling hjelper.";
  }

  if (phase === "day") {
    if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
      return language === "en"
        ? "When rhythm is unstable, steady energy matters more than high energy. Choose one thing and add a short pause."
        : "Når rytmen er ustabil, er jevn energi viktigere enn mye energi. Velg én ting og legg inn en kort pause.";
    }

    return language === "en"
      ? "Late morning is a good phase for contact, focus, and small choices that make the day lighter."
      : "Formiddagen er en god fase for kontakt, fokus og små valg som gjør dagen lettere.";
  }

  if (phase === "afternoon") {
    return language === "en" ? "The day is not lost. Afternoon can be a small new start, with less pressure." : "Dagen er ikke tapt. Ettermiddagen kan være en ny liten start, med lavere press.";
  }

  if (phase === "evening") {
    const weatherLine = weather && weather.temperature !== null && weather.temperature < 2 ? (language === "en" ? "Fresh air can be short and simple." : "Frisk luft kan være kort og enkel.") : "";
    return language === "en"
      ? `Lower light and pace. Dimmer light tells the body the day can loosen its grip.${weatherLine ? ` ${weatherLine}` : ""}`
      : `Senk lys og tempo. Lavere lys forteller kroppen at dagen kan slippe taket.${weatherLine ? ` ${weatherLine}` : ""}`;
  }

  return language === "en" ? "Now the body needs darkness and calm. Keep it simple, dark, and without expectation." : "Nå trenger kroppen mørke og ro. Hold det enkelt, mørkt og uten forventning.";
}

export function getCurrentRhythmPhase(date: Date, _plan?: RhythmPlan, _dayType?: DayType): SectionTitle {
  const windows = buildPhaseWindows();
  const minute = getCycleMinute(date);
  const window = windows.find((phaseWindow) => minute >= phaseWindow.start && minute < phaseWindow.end);
  return window?.title || "Natt";
}

export function getRhythmProgress(date: Date, _plan?: RhythmPlan, _dayType?: DayType) {
  const minute = getCycleMinute(date);
  return clampNumber(((minute - PHASE_DAY_START_MINUTES) / 1440) * 100, 0, 100);
}

export function getPhasePreviewDate(now: Date, phase: SectionTitle | null, _plan?: RhythmPlan, _dayType?: DayType) {
  if (!phase) return now;

  const window = buildPhaseWindows().find((phaseWindow) => phaseWindow.title === phase);
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

export function getRhythmCalendarContext(
  date: Date,
  plan?: Pick<RhythmPlan, "socialJetlagMinutes" | "socialJetlagLabel">,
  options: RhythmCalendarOptions = {}
): RhythmCalendarContext {
  const language = options.language || "no";
  const socialJetlagDetail =
    plan && plan.socialJetlagMinutes >= SOCIAL_JETLAG_THRESHOLD_MINUTES
      ? language === "en"
        ? `Weekdays and weekends differ by about ${plan.socialJetlagLabel}. That is common, but it can confuse the body a little. Small anchors help over time.`
        : `Ukedag og helg skiller med ${plan.socialJetlagLabel}. Det er vanlig, men kan forvirre kroppen litt. Små ankre hjelper over tid.`
      : undefined;
  const localHolidayName = options.holidayAwarenessEnabled === false ? "" : getNorwegianHolidayName(date);
  const holidayName = options.holiday?.name || localHolidayName;
  const dayType = options.dayType || inferDayType(date, Boolean(holidayName));

  if (dayType === "free_day") {
    return {
      label: language === "en" ? "Free day" : "Fridag",
      note:
        language === "en"
          ? `${holidayName ? `${holidayName}. ` : ""}Free days do not need to be strict. A little light and one gentle anchor can be enough.`
          : `${holidayName ? `${holidayName}. ` : ""}Fridager trenger ikke være strenge. Litt lys og ett rolig anker kan være nok.`,
      detail: socialJetlagDetail,
      tone: "free_day",
      holidayName,
    };
  }

  if (dayType === "weekend") {
    return {
      label: language === "en" ? "Weekend" : "Helg",
      note:
        socialJetlagDetail ||
        (language === "en"
          ? "The weekend rhythm can be looser, while still keeping one kind anchor."
          : "Helgerytmen kan være løsere, men ett mildt anker kan fortsatt hjelpe."),
      detail:
        socialJetlagDetail && language === "en"
          ? "Try keeping one soft morning anchor on free days too."
          : socialJetlagDetail
            ? "Prøv å beholde ett mykt morgenanker også på fridager."
            : undefined,
      tone: "weekend",
    };
  }

  return {
    label: language === "en" ? "Weekday" : "Ukedag",
    note:
      language === "en"
        ? "A regular weekday. Small adjustments work best when they are easy to repeat."
        : "Vanlig ukedag. Små justeringer fungerer best når de er lette å gjenta.",
    detail: socialJetlagDetail,
    tone: "weekday",
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

function buildPhaseWindows(): PhaseWindow[] {
  return FIXED_PHASE_WINDOWS;
}

function inferDayType(date: Date, isHoliday: boolean): DayType {
  if (isHoliday) return "free_day";
  const day = date.getDay();
  if (day === 0 || day === 6) return "weekend";
  return "weekday";
}

function getCycleMinute(date: Date) {
  const minute = date.getHours() * 60 + date.getMinutes();
  return minute < PHASE_DAY_START_MINUTES ? minute + 1440 : minute;
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

function getLifeAreaMicroStep(phase: DayPhase, selectedLifeAreas: LifeArea[], dayType: DayType, language: SupportedLanguage = "no") {
  const freeDay = dayType === "weekend" || dayType === "free_day";
  const preferred = selectedLifeAreas[0] || "energy";
  if (language === "en") {
    const englishSteps: Record<DayPhase, Partial<Record<LifeArea, string>>> = {
      morning: {
        energy: "Open the curtains and drink a little water.",
        mood: "Start without judging the whole day.",
        focus: freeDay ? "Choose one small anchor, not a full plan." : "Write down one thing to start with.",
        training: "Take two minutes of gentle movement.",
        food: "Make breakfast easier to begin.",
        home: "Put one small thing in place.",
        social: "Send one low-pressure message if it fits.",
        reflection: "Write down one thought before the pace rises.",
        sleep: "Get light early, so evening has better direction.",
      },
      day: {
        energy: "Take a short pause before moving on.",
        mood: "Make one thing small enough to start.",
        focus: freeDay ? "Let the day have one light anchor." : "Choose one task and close the rest a little.",
        training: "Take a short walk if the body wants it.",
        food: "Eat something simple before energy drops.",
        home: "Clear one small surface.",
        social: "Reply to one person without making it big.",
        reflection: "Write one sentence about what the day needs.",
        sleep: "Avoid pushing everything heavy into the evening.",
      },
      afternoon: {
        energy: "Pause for two minutes and adjust the pace.",
        mood: "Remember that the day can begin a little again.",
        focus: "Finish one small part, not the whole list.",
        training: "Put out something that makes movement easier.",
        food: "Make the next meal a little easier.",
        home: "Do one practical thing before evening.",
        social: "Choose small contact over none.",
        reflection: "Write down one thing that can wait.",
        sleep: "Avoid late caffeine if rhythm feels sensitive.",
      },
      evening: {
        energy: "Lower light and sound one notch.",
        mood: "Let the day finish without judgment.",
        focus: "Set aside one open thread for tomorrow.",
        training: "Choose gentle stretching over high intensity.",
        food: "Keep food or kitchen simple enough.",
        home: "Lay out one thing for tomorrow.",
        social: "End conversations softly if you need calm.",
        reflection: "Write down one thought that can wait.",
        sleep: "Dim the light and make the screen less important.",
      },
      night: {
        energy: "Do not use the night to find new speed.",
        mood: "You do not need to solve life now.",
        focus: "Let the next task wait for daylight.",
        training: "Keep the body calm and darkness simple.",
        food: "Make as little fuss of the night as possible.",
        home: "Let the mess wait if the body needs rest.",
        social: "Let messages wait if they are not urgent.",
        reflection: "Put one thought somewhere outside your head.",
        sleep: "Keep it dark, low, and simple.",
      },
    };

    return englishSteps[phase][preferred] || englishSteps[phase].energy || "";
  }

  const steps: Record<DayPhase, Partial<Record<LifeArea, string>>> = {
    morning: {
      energy: "Åpne gardinene og drikk litt vann.",
      mood: "Start uten å vurdere hele dagen.",
      focus: freeDay ? "Velg ett lite anker, ikke en plan." : "Skriv ned én ting du starter med.",
      training: "Ta to minutter rolig bevegelse.",
      food: "Gjør frokosten litt enklere å starte på.",
      home: "Legg én liten ting på plass.",
      social: "Send én lavterskel melding hvis det passer.",
      reflection: "Skriv ned én tanke før tempoet øker.",
      sleep: "Få lys tidlig, så kvelden får bedre retning.",
    },
    day: {
      energy: "Ta en kort pause før du går videre.",
      mood: "Gjør én ting liten nok til å starte.",
      focus: freeDay ? "La dagen ha ett lett holdepunkt." : "Velg én oppgave og lukk resten litt.",
      training: "Gå en kort runde hvis kroppen vil.",
      food: "Spis noe enkelt før energien faller.",
      home: "Rydd én liten flate.",
      social: "Svar én person uten å gjøre det stort.",
      reflection: "Skriv én setning om hva dagen trenger.",
      sleep: "Unngå å skyve alt tungt til kvelden.",
    },
    afternoon: {
      energy: "Stopp opp i to minutter og juster tempoet.",
      mood: "Minn deg selv på at dagen kan starte litt på nytt.",
      focus: "Fullfør én liten del, ikke hele listen.",
      training: "Legg frem noe som gjør bevegelse lettere.",
      food: "Gjør neste måltid litt enklere.",
      home: "Ta én praktisk ting før kvelden.",
      social: "Velg liten kontakt fremfor ingenting.",
      reflection: "Skriv ned én ting som kan vente.",
      sleep: "Unngå koffein sent hvis rytmen er sårbar.",
    },
    evening: {
      energy: "Senk lys og lyd ett hakk.",
      mood: "La dagen få bli ferdig uten dom.",
      focus: "Legg bort én åpen tråd til i morgen.",
      training: "Velg rolig strekk fremfor høy intensitet.",
      food: "Gjør mat eller kjøkken enkelt nok.",
      home: "Legg klart én ting til i morgen.",
      social: "Avslutt samtaler mykt hvis du trenger ro.",
      reflection: "Skriv ned én tanke som kan vente.",
      sleep: "Demp lyset og gjør skjermen mindre viktig.",
    },
    night: {
      energy: "Ikke bruk natten på å finne ny fart.",
      mood: "Du trenger ikke løse livet nå.",
      focus: "La neste oppgave vente til dagslys.",
      training: "Hold kroppen rolig og mørket enkelt.",
      food: "Gjør minst mulig styr ut av natten.",
      home: "La rotet vente hvis kroppen trenger hvile.",
      social: "La meldinger vente hvis de ikke haster.",
      reflection: "Legg én tanke et sted utenfor hodet.",
      sleep: "Hold det mørkt, lavt og enkelt.",
    },
  };

  return steps[phase][preferred] || steps[phase].energy || "";
}

function getWeatherLightHint(weather?: WeatherViewModel, language: SupportedLanguage = "no") {
  if (!weather) return language === "en" ? "Light tells the body the day has started." : "Lys forteller kroppen at dagen har startet.";

  const code = weather.symbolCode.toLowerCase();
  if (weather.temperature !== null && weather.temperature <= 0) {
    return language === "en" ? "Fresh air still helps, even if the trip is short." : "Frisk luft hjelper fortsatt, selv om turen er kort.";
  }

  if (code.includes("clearsky") || code.includes("fair")) {
    return language === "en" ? "The light is strong today; a few minutes outside helps rhythm." : "Lyset er sterkt i dag; noen minutter ute hjelper rytmen.";
  }

  if (code.includes("cloudy") || code.includes("fog")) {
    return language === "en" ? "Even grey daylight helps the body understand day." : "Selv grått dagslys hjelper kroppen å forstå dag.";
  }

  if (code.includes("rain") || code.includes("sleet") || code.includes("snow")) {
    return language === "en" ? "A calm day still counts; a bright window is better than nothing." : "En rolig dag teller fortsatt; et lyst vindu er bedre enn ingenting.";
  }

  return language === "en" ? "Light tells the body the day has started." : "Lys forteller kroppen at dagen har startet.";
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

function formatWindow(start: number, end: number, _language: SupportedLanguage = "no") {
  return `${formatClockMinutes(start)}-${formatClockMinutes(end)}`;
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
