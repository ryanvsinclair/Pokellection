import type { CardLanguage } from "@/types/database";

export const CARD_LANGUAGES: CardLanguage[] = [
  "english",
  "french",
  "japanese",
  "korean",
];

const LANGUAGE_LABELS: Record<CardLanguage, string> = {
  english: "English",
  french: "French",
  japanese: "Japanese",
  korean: "Korean",
};

export function formatCardLanguage(language: CardLanguage): string {
  return LANGUAGE_LABELS[language] ?? language;
}

export function isCardLanguage(value: string): value is CardLanguage {
  return CARD_LANGUAGES.includes(value as CardLanguage);
}

/** Default language for listings not tied to a language showcase. */
export const DEFAULT_CARD_LANGUAGE: CardLanguage = "english";
