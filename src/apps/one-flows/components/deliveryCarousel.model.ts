/**
 * Delivery instructions carousel — domain model
 *
 * Figma: widget 856:80576, cards 875:6610 (voice note), 875:6621 (call),
 * 875:6636 (doorbell) and 875:6651 (handoff).
 *
 * Three questions, each always answered, plus an optional voice note. Unlike
 * the four-chip card (deliveryInstructions.model) nothing is on/off here, and
 * unlike the rider's sentence (riderMessage.model) the answers are always on
 * screen — you scroll to them rather than opening anything.
 *
 * Geometry lives here because the carousel's whole character is that its slides
 * are *different widths* — the third one overflows the 351px frame, which is
 * what tells you the row scrolls.
 */

import type { CarouselGlyphId } from "./deliveryCarouselIcons";

export type CarouselQuestionId = "handoff" | "call" | "doorbell";

export type CarouselOption = {
  id: string;
  label: string;
  /** Only the stacked switch draws icons; the inline pills are text alone. */
  glyph?: CarouselGlyphId;
};

export type CarouselQuestion = {
  id: CarouselQuestionId;
  glyph: CarouselGlyphId;
  prompt: string;
  /** `stack` = the 3-option vertical switch; `inline` = the 2-option pill. */
  layout: "stack" | "inline";
  /** Figma hugs the prompt to a fixed measure so it breaks where it's drawn to. */
  promptWidth: number;
  /** The switch track's width; the thumb fills it minus the 4px inset. */
  trackWidth: number;
  options: CarouselOption[];
};

/* Figma geometry — the frame is 351×214. */
export const WIDGET_W = 351;
export const HEADER_H = 44;
export const VIEWPORT_H = 138;
export const SAVE_H = 32;
export const SLIDE_H = 122;
/** Stacked call + doorbell cards, and the gap between them. */
export const INLINE_CARD_H = 56;
export const INLINE_CARD_GAP = 10;
export const TRACK_INSET = 12;
export const SLIDE_GAP = 10;

export const VOICE_SLIDE_W = 103;

export const CAROUSEL_QUESTIONS: CarouselQuestion[] = [
  {
    id: "handoff",
    glyph: "orderBox",
    prompt: "How should we deliver?",
    layout: "stack",
    promptWidth: 79,
    trackWidth: 156,
    options: [
      { id: "hand", label: "Hand it to me", glyph: "hand" },
      { id: "door", label: "Leave at door", glyph: "doorOutline" },
      { id: "security", label: "Leave at security", glyph: "security" },
    ],
  },
  {
    id: "call",
    glyph: "call",
    prompt: "Should we call while delivering?",
    layout: "inline",
    promptWidth: 100,
    trackWidth: 150,
    options: [
      { id: "callMe", label: "Call me" },
      { id: "noCall", label: "Don’t call" },
    ],
  },
  {
    id: "doorbell",
    glyph: "bell",
    prompt: "Should we ring the doorbell?",
    layout: "inline",
    promptWidth: 90,
    trackWidth: 160,
    options: [
      { id: "ring", label: "Ring bell" },
      { id: "noRing", label: "Don’t ring" },
    ],
  },
];

export const INLINE_QUESTIONS = CAROUSEL_QUESTIONS.filter((q) => q.layout === "inline");
export const STACK_QUESTION = CAROUSEL_QUESTIONS.find((q) => q.layout === "stack")!;

export type CarouselChoices = Record<CarouselQuestionId, string>;

/** The answers as Figma draws them. */
export const DEFAULT_CAROUSEL_CHOICES: CarouselChoices = {
  handoff: "hand",
  call: "callMe",
  doorbell: "ring",
};

/**
 * Voice note. Figma draws the idle card (875:6610) and the recorded one
 * (877:6922, with its play button and Remove); `recording` and `playing` are
 * the two transitions between them and are authored.
 */
export type VoiceNoteState = "idle" | "recording" | "recorded" | "playing";

export const VOICE_LABEL: Record<VoiceNoteState, string> = {
  idle: "Leave a note for your rider",
  recording: "Listening… tap to stop",
  recorded: "Voice note added",
  playing: "Playing note…",
};

/** The recorded card drops to B12 — Figma sets 13px idle, 12px once answered. */
export const VOICE_CAPTION: Record<VoiceNoteState, string> = {
  idle: "text-[13px] leading-5",
  recording: "text-[13px] leading-5",
  recorded: "text-[12px] leading-[18px]",
  playing: "text-[12px] leading-[18px]",
};

/** No real audio in the prototype, so playback is a timed sweep. */
export const NOTE_DURATION_MS = 2800;
