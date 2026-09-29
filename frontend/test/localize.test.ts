import { describe, expect, it } from "vitest";

import {
  cardText,
  EN,
  localization,
  localizationKey,
  pageLanguage,
  PL,
  polishPlural,
} from "../src/localize";
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

describe("card text", () => {
  it("picks the Polish table for any Polish language tag", () => {
    expect(cardText("pl")).toBe(PL);
    expect(cardText("pl-PL")).toBe(PL);
    expect(cardText("en")).toBe(EN);
    expect(cardText("de")).toBe(EN);
    expect(cardText(undefined)).toBe(EN);
  });

  it("uses the Polish plural forms", () => {
    for (const count of [1]) expect(polishPlural(count, "one", "few", "many")).toBe("one");
    for (const count of [2, 3, 4, 22, 104]) {
      expect(polishPlural(count, "one", "few", "many")).toBe("few");
    }
    for (const count of [0, 5, 11, 12, 13, 14, 25, 112]) {
      expect(polishPlural(count, "one", "few", "many")).toBe("many");
    }
  });

  it("counts visits in both languages", () => {
    expect(EN.visits(1)).toBe("1 visit");
    expect(EN.visits(3)).toBe("3 visits");
    expect(EN.waiting(2)).toBe("2 visits waiting");
    expect(PL.visits(1)).toBe("1 wizyta");
    expect(PL.visits(3)).toBe("3 wizyty");
    expect(PL.visits(5)).toBe("5 wizyt");
    expect(PL.poop(2)).toBe("2 kupy");
    expect(PL.pee(5)).toBe("5 siku");
    expect(PL.abnormal(5)).toBe("5 nieprawidłowych");
    expect(PL.waiting(1)).toBe("1 wizyta do przypisania");
  });

  it("adds the card text to the localization", () => {
    expect(localization(undefined).text).toBe(EN);
    const hass = {
      language: "pl",
      locale: { language: "pl" },
    } as unknown as HomeAssistant;
    expect(localization(hass).text).toBe(PL);
  });

  it("reads the language of the page", () => {
    document.documentElement.lang = "pl";
    expect(pageLanguage()).toBe("pl");
    document.documentElement.lang = "";
    expect(pageLanguage()).toBe("");
  });
});
