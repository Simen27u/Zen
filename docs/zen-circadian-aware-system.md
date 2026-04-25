# Zen - Circadian-Aware System

Dette dokumentet er prosjektets arbeidsnotat for Zen sin døgnrytme-retning. Les dette før større endringer i rytme, onboarding, daglige nudges eller språkføring.

## Core Philosophy

Zen is a calm, adaptive daily surface that helps users align with their biological rhythm.

The goal is NOT:
- productivity
- strict sleep schedules
- forcing behavior

The goal IS:
- reduce circadian misalignment
- stabilize rhythm first
- gradually move toward alignment
- improve mood, energy, and sleep

Key scientific insight:
Fatigue is often not caused by too little sleep, but by sleep happening at the wrong biological time.

## Core Model

Zen separates TWO things:

1. Chronotype (underlying tendency)
2. Current Rhythm State (what is actually happening now)

This is critical.

Users often cannot identify their real chronotype if their rhythm is unstable.

## Rhythm Reality

A user's rhythm can be:

- shifted
- unstable
- inconsistent
- affected by weekends vs weekdays

This happens when:
- sleep timing varies
- light exposure is mistimed
- screens are used late
- caffeine is used late
- stress is high
- weekends differ strongly from weekdays

Result:
- always tired
- "out of rhythm" feeling
- confusion about own body

Important UX truth:
The rhythm is NOT broken - it is displaced and unstable.

## UX Principle

Zen must NEVER assume:
- the user knows their chronotype
- the user is "doing it wrong"

Zen should say:
"Let's stabilize first"

## Onboarding

Instead of asking:

"What is your chronotype?"

Ask:

"How does your rhythm feel right now?"

Options:

- I feel best earlier in the day
- I feel best later in the day
- I feel tired most of the time
- My rhythm feels unstable
- My weekdays and weekends are very different

## Data Model

```ts
type DayPhase = "morning" | "work" | "evening" | "night";

type Chronotype = "morning" | "intermediate" | "evening" | "unknown";

type RhythmState =
  | "stable"
  | "slightly_shifted"
  | "delayed"
  | "unstable"
  | "social_jetlag"
  | "unknown";

type RhythmProfile = {
  chronotype: Chronotype;
  rhythmState: RhythmState;
  weekdaySleepTime?: string;
  weekdayWakeTime?: string;
  weekendSleepTime?: string;
  weekendWakeTime?: string;
};
```

## Core System Logic

```ts
function getCircadianMessage(
  phase: DayPhase,
  profile: RhythmProfile,
  weather?: string
) {
  const { chronotype, rhythmState } = profile;

  if (phase === "morning") {
    if (rhythmState === "unstable" || rhythmState === "social_jetlag") {
      return "Mornings can feel heavy when your rhythm is shifting. Start gently, get some light, and take one small step.";
    }

    if (chronotype === "evening") {
      return "Your rhythm may run later. Keep the morning soft and simple.";
    }

    return "Give your body a calm start. Light, water, and one small action helps.";
  }

  if (phase === "work") {
    return "This is a good phase for focus. Choose one thing that helps your day.";
  }

  if (phase === "evening") {
    return "Slow things down. Lower light and tempo helps your body prepare for rest.";
  }

  if (phase === "night") {
    return "Now your body needs rest. Keep things dark, simple, and calm.";
  }
}
```

## Day Phases

Morning:
- light exposure
- gentle activation
- no pressure

Work / Day:
- focus support
- energy stability

Evening:
- reduce stimulation
- prepare sleep

Night:
- minimal UI
- no expectations

## Light

Morning:
"Light tells your body the day has started"

Evening:
"Lower light tells your body to slow down"

Night:
"Darkness protects your rhythm"

## Weekend vs Weekday Handling

If difference is large:

"Your weekday and weekend rhythm are different. That's common, but it can confuse your body."

Do NOT say:
"You need to fix this"

Say:
"Small consistency helps over time"

## Behavioral Strategy

Zen should promote:

- earlier light exposure
- dimmer evenings
- consistent wake time, softly
- gradual sleep adjustments
- reduced late stimulation
- softer transitions

NEVER:

- drastic changes
- rigid schedules

## Micro-Steps

Morning:

- drink water
- open curtains
- go outside briefly

Day:

- do one important task
- take a short break

Evening:

- dim lights
- reduce screens
- prepare something small

Night:

- put phone away
- breathe slowly
- no expectations

## Weather Integration

Sunny:
"Light is strong today - a few minutes outside helps your rhythm"

Cloudy:
"Even grey daylight still helps your body"

Rain:
"A calm day still counts"

Cold:
"Fresh air still helps you wake up"

## Gradual Adjustment Rule

Always suggest:

- 10-15 minute changes

Never:

- big jumps

## System Order

1. Stabilize rhythm
2. Reduce variability
3. Introduce consistency
4. THEN personalize chronotype

## Product Feeling

Zen should feel like:

"A calm layer that gently brings you closer to your natural rhythm"

NOT:
"A system telling you what to do"

## Implementation Requirements

- Time-based day phases
- Rhythm state input, not just chronotype
- Adaptive messaging
- Soft UX tone
- Light-based guidance
- Weather integration
- Small step system
- Weekend vs weekday awareness
- Gradual adjustment logic

Goal:
Help users stabilize and align their biological rhythm over time through subtle, adaptive guidance.

