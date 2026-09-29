// The card text in English and Polish, and the language and locale settings of the card.

import type { FrontendLocale, HomeAssistant, LocalizeFunc, VisitType } from "./types";

export interface Localization {
  locale: FrontendLocale;
  text: CardText;
  /** The exception texts of the integration, once they are loaded. */
  exceptions?: LocalizeFunc;
}

/** Every text of the card. Functions build the texts with values or plural forms. */
export interface CardText {
  types: Record<VisitType, string>;
  previousDay: string;
  nextDay: string;
  pickDay: string;
  previousMonth: string;
  nextMonth: string;
  cat: string;
  unknown: string;
  unknownOption: (waiting: number) => string;
  visits: (count: number) => string;
  poop: (count: number) => string;
  pee: (count: number) => string;
  abnormal: (count: number) => string;
  waiting: (count: number) => string;
  abnormalChip: string;
  stoolPhoto: string;
  onCameraOnly: string;
  noVisitsWaiting: string;
  noVisitsOnDay: string;
  catGone: string;
  noCats: string;
  notUpdating: (when: string) => string;
  missingParts: (names: string) => string;
  requestFailed: string;
  deleteTitle: string;
  deleteText: string;
  delete: string;
  cancel: string;
  save: string;
  type: string;
  memo: string;
  pickType: string;
  recordingOnCamera: string;
  cannotPlay: string;
  close: string;
  configCat: string;
  configCatHelper: string;
  configHideCatPicker: string;
  configHideCatPickerHelper: string;
  configCatInvalid: string;
  configHideCatPickerInvalid: string;
  pickerName: string;
  pickerDescription: string;
}

/** The Polish plural form: one for 1, few for 2-4 except 12-14, many for the rest. */
export function polishPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) {
    return one;
  }
  const ones = count % 10;
  const tens = count % 100;
  return ones >= 2 && ones <= 4 && (tens < 12 || tens > 14) ? few : many;
}

const englishVisits = (count: number) => `${count} ${count === 1 ? "visit" : "visits"}`;
const polishVisits = (count: number) =>
  `${count} ${polishPlural(count, "wizyta", "wizyty", "wizyt")}`;

export const EN: CardText = {
  types: {
    pee: "Pee",
    poop: "Poop",
    lingering: "Lingering",
    unknown: "Unknown",
  },
  previousDay: "Previous day",
  nextDay: "Next day",
  pickDay: "Pick a day",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  cat: "Cat",
  unknown: "Unknown",
  unknownOption: (waiting) => `Unknown (${waiting})`,
  visits: englishVisits,
  poop: (count) => `${count} poop`,
  pee: (count) => `${count} pee`,
  abnormal: (count) => `${count} abnormal`,
  waiting: (count) => `${englishVisits(count)} waiting`,
  abnormalChip: "Abnormal",
  stoolPhoto: "Stool photo",
  onCameraOnly: "On camera only",
  noVisitsWaiting: "No visits are waiting.",
  noVisitsOnDay: "No visits on this day.",
  catGone: "The cat of this card is not in the SiiPet account.",
  noCats: "The SiiPet account has no cats.",
  notUpdating: (when) => `SiiPet is not updating. Last update: ${when}.`,
  missingParts: (names) => `The card cannot start. The Home Assistant frontend has no ${names}.`,
  requestFailed: "The request failed.",
  deleteTitle: "Delete this visit?",
  deleteText: "SiiPet deletes the visit and its recording. You cannot undo this.",
  delete: "Delete",
  cancel: "Cancel",
  save: "Save",
  type: "Type",
  memo: "Memo",
  pickType: "Pick a type as well.",
  recordingOnCamera: "Recording is on the camera only.",
  cannotPlay: "This browser cannot play the recording. Safari and the Home Assistant app can.",
  close: "Close",
  configCat: "Cat",
  configCatHelper: "Optional. Without a cat, the card starts with the first cat.",
  configHideCatPicker: "Hide the cat picker",
  configHideCatPickerHelper: "Keep the card on one cat.",
  configCatInvalid: "The cat option must be a device ID.",
  configHideCatPickerInvalid: "The hide_cat_picker option must be true or false.",
  pickerName: "SiiPet visits",
  pickerDescription: "The litter box visits of each cat, day by day.",
};

export const PL: CardText = {
  types: {
    pee: "Siku",
    poop: "Kupa",
    lingering: "Bez załatwienia",
    unknown: "Nieznany",
  },
  previousDay: "Poprzedni dzień",
  nextDay: "Następny dzień",
  pickDay: "Wybierz dzień",
  previousMonth: "Poprzedni miesiąc",
  nextMonth: "Następny miesiąc",
  cat: "Kot",
  unknown: "Nieznany",
  unknownOption: (waiting) => `Nieznany (${waiting})`,
  visits: polishVisits,
  poop: (count) => `${count} ${polishPlural(count, "kupa", "kupy", "kup")}`,
  pee: (count) => `${count} siku`,
  abnormal: (count) =>
    `${count} ${polishPlural(count, "nieprawidłowa", "nieprawidłowe", "nieprawidłowych")}`,
  waiting: (count) => `${polishVisits(count)} do przypisania`,
  abnormalChip: "Nieprawidłowa",
  stoolPhoto: "Zdjęcie kupy",
  onCameraOnly: "Tylko w kamerze",
  noVisitsWaiting: "Brak wizyt do przypisania.",
  noVisitsOnDay: "Brak wizyt tego dnia.",
  catGone: "Kota wybranego dla tej karty nie ma na koncie SiiPet.",
  noCats: "Na koncie SiiPet nie ma kotów.",
  notUpdating: (when) => `SiiPet nie aktualizuje danych. Ostatnia aktualizacja: ${when}.`,
  missingParts: (names) =>
    `Karta nie może się uruchomić. W interfejsie Home Assistant brakuje: ${names}.`,
  requestFailed: "Żądanie nie powiodło się.",
  deleteTitle: "Usunąć tę wizytę?",
  deleteText: "SiiPet usunie wizytę i jej nagranie. Tego nie można cofnąć.",
  delete: "Usuń",
  cancel: "Anuluj",
  save: "Zapisz",
  type: "Typ",
  memo: "Notatka",
  pickType: "Wybierz też typ.",
  recordingOnCamera: "Nagranie jest tylko w kamerze.",
  cannotPlay:
    "Ta przeglądarka nie odtworzy nagrania. Safari i aplikacja Home Assistant to potrafią.",
  close: "Zamknij",
  configCat: "Kot",
  configCatHelper: "Opcjonalnie. Bez kota karta zaczyna od pierwszego kota.",
  configHideCatPicker: "Ukryj wybór kota",
  configHideCatPickerHelper: "Karta zostaje przy jednym kocie.",
  configCatInvalid: "Opcja cat musi być identyfikatorem urządzenia.",
  configHideCatPickerInvalid: "Opcja hide_cat_picker musi mieć wartość true lub false.",
  pickerName: "Wizyty SiiPet",
  pickerDescription: "Wizyty każdego kota w kuwecie, dzień po dniu.",
};

/** The Polish text for a Polish language tag, else the English text. */
export function cardText(language: string | undefined): CardText {
  return language?.split("-")[0].toLowerCase() === "pl" ? PL : EN;
}

/** The language of the page. Home Assistant sets it to the language of the user. */
export function pageLanguage(): string {
  return document.documentElement.lang;
}

/** The localization of the user of `hass`. English when `hass` has no language. */
export function localization(hass: HomeAssistant | undefined): Localization {
  const language = hass?.locale?.language ?? hass?.language ?? "en";
  return { locale: { ...hass?.locale, language }, text: cardText(language) };
}

/** A key that changes when the language or a locale setting that the card uses changes. */
export function localizationKey(hass: HomeAssistant | undefined): string {
  const { locale } = localization(hass);
  return `${locale.language}|${locale.time_format ?? ""}|${locale.first_weekday ?? ""}`;
}
