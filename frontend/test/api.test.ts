import { describe, expect, it, vi } from "vitest";

import {
  deleteVisit,
  errorText,
  fetchCalendar,
  fetchCats,
  fetchDay,
  fetchQueue,
  fetchVisit,
  isOutsideWindow,
  isPermanentFailure,
  resolveVideo,
  updateVisit,
} from "../src/api";
import { EN, localization, PL } from "../src/localize";
import type { HomeAssistant } from "../src/types";

function fakeHass(result: unknown = {}) {
  const callWS = vi.fn().mockResolvedValue(result);
  const callService = vi.fn().mockResolvedValue(undefined);
  return { hass: { callWS, callService } as unknown as HomeAssistant, callWS, callService };
}

describe("api", () => {
  it("sends the websocket commands of the integration", async () => {
    const { hass, callWS } = fakeHass();
    await fetchCats(hass);
    await fetchDay(hass, "2026-09-27", "dev-milo");
    await fetchQueue(hass);
    await fetchCalendar(hass, "2026-09", "dev-milo");
    await fetchVisit(hass, "ev-1");
    expect(callWS.mock.calls.map((call) => call[0])).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/queue" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
      { type: "siipet/visit", event_id: "ev-1" },
    ]);
  });

  it("resolves the recording through the media browser", async () => {
    const { hass, callWS } = fakeHass({ url: "https://video", mime_type: "video/mp4" });
    expect(await resolveVideo(hass, "ev-1")).toBe("https://video");
    expect(callWS).toHaveBeenCalledWith({
      type: "media_source/resolve_media",
      media_content_id: "media-source://siipet/visit/ev-1",
    });
  });

  it("edits and deletes through the actions, with no frontend toast", async () => {
    const { hass, callService } = fakeHass();
    await updateVisit(hass, { event_id: "ev-1", note: "x" });
    await deleteVisit(hass, "ev-1");
    expect(callService.mock.calls).toEqual([
      ["siipet", "update_visit", { event_id: "ev-1", note: "x" }, undefined, false],
      ["siipet", "delete_visit", { event_id: "ev-1" }, undefined, false],
    ]);
  });

  it("tells a visit outside the window from other failures", () => {
    const outside = { code: "service_validation_error", translation_key: "visit_not_in_window" };
    expect(isOutsideWindow(outside)).toBe(true);
    expect(isOutsideWindow({ error: outside })).toBe(true);
    expect(
      isOutsideWindow({ code: "service_validation_error", translation_key: "not_loaded" }),
    ).toBe(false);
    expect(isOutsideWindow(new Error("down"))).toBe(false);
  });

  it("tells a permanent validation error from one a retry can still clear", () => {
    expect(
      isPermanentFailure({
        code: "service_validation_error",
        translation_key: "date_out_of_range",
      }),
    ).toBe(true);
    expect(
      isPermanentFailure({ code: "service_validation_error", translation_key: "invalid_cat" }),
    ).toBe(true);
    expect(
      isPermanentFailure({ code: "service_validation_error", translation_key: "not_loaded" }),
    ).toBe(false);
    expect(isPermanentFailure({ code: "home_assistant_error", message: "boom" })).toBe(false);
    expect(isPermanentFailure(new Error("down"))).toBe(false);
  });
});

describe("errorText", () => {
  const polish = {
    ...localization(undefined),
    text: PL,
    localize: (key: string, values?: Record<string, unknown>) =>
      key === "component.siipet.exceptions.date_out_of_range.message"
        ? `Wybierz datę od ${values?.first} do ${values?.last}.`
        : "",
  };
  const outOfRange = {
    code: "service_validation_error",
    message: "Choose a date from 2026-08-28 to 2026-09-27",
    translation_domain: "siipet",
    translation_key: "date_out_of_range",
    translation_placeholders: { first: "2026-08-28", last: "2026-09-27" },
  };

  it("translates a SiiPet error with its placeholders", () => {
    expect(errorText(outOfRange, polish)).toBe("Wybierz datę od 2026-08-28 do 2026-09-27.");
    expect(errorText({ error: outOfRange }, polish)).toBe(
      "Wybierz datę od 2026-08-28 do 2026-09-27.",
    );
  });

  it("falls back to the message, then to the text of the card", () => {
    const english = localization(undefined);
    expect(english.text).toBe(EN);
    expect(errorText(outOfRange, english)).toBe("Choose a date from 2026-08-28 to 2026-09-27");
    expect(errorText({ ...outOfRange, translation_key: "not_loaded" }, polish)).toBe(
      "Choose a date from 2026-08-28 to 2026-09-27",
    );
    expect(errorText({ ...outOfRange, translation_domain: "homeassistant" }, polish)).toBe(
      "Choose a date from 2026-08-28 to 2026-09-27",
    );
    expect(errorText({ code: "x", message: "SiiPet could not" }, english)).toBe("SiiPet could not");
    expect(errorText({ error: { code: "x", message: "nested" } }, english)).toBe("nested");
    expect(errorText(new Error("plain"), english)).toBe("plain");
    expect(errorText(undefined, english)).toBe("The request failed.");
    expect(errorText(undefined, polish)).toBe("Żądanie nie powiodło się.");
  });
});
