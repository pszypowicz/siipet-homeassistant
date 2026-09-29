import { describe, expect, it } from "vitest";

import { localization, localizationKey } from "../src/localize";
import type { HomeAssistant } from "../src/types";

function hassWith(fields: Partial<HomeAssistant>): HomeAssistant {
  return fields as HomeAssistant;
}

describe("localization", () => {
  it("takes the locale of the profile", () => {
    const hass = hassWith({
      language: "pl",
      locale: { language: "pl", time_format: "24", first_weekday: "monday" },
    });
    expect(localization(hass).locale).toEqual({
      language: "pl",
      time_format: "24",
      first_weekday: "monday",
    });
  });

  it("falls back to the language of hass, then to English", () => {
    expect(localization(hassWith({ language: "pl" })).locale.language).toBe("pl");
    expect(localization(undefined).locale.language).toBe("en");
  });

  it("changes its key only for the settings that the card uses", () => {
    const hass = hassWith({
      language: "en",
      locale: { language: "en", time_format: "24", first_weekday: "monday" },
    });
    const same = hassWith({ ...hass, states: {} });
    const other = hassWith({
      ...hass,
      locale: { ...hass.locale!, time_format: "12" },
    });
    expect(localizationKey(same)).toBe(localizationKey(hass));
    expect(localizationKey(other)).not.toBe(localizationKey(hass));
  });
});
