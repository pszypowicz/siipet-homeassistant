// The language and the locale settings that the card shows its dates in.

import type { FrontendLocale, HomeAssistant } from "./types";

export interface Localization {
  locale: FrontendLocale;
}

/** The localization of the user of `hass`. English when `hass` has no language. */
export function localization(hass: HomeAssistant | undefined): Localization {
  const language = hass?.locale?.language ?? hass?.language ?? "en";
  return { locale: { ...hass?.locale, language } };
}

/** A key that changes when the language or a locale setting that the card uses changes. */
export function localizationKey(hass: HomeAssistant | undefined): string {
  const { locale } = localization(hass);
  return `${locale.language}|${locale.time_format ?? ""}|${locale.first_weekday ?? ""}`;
}
