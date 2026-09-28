import { describe, expect, it, vi } from "vitest";

import {
  deleteVisit,
  errorMessage,
  fetchCalendar,
  fetchCats,
  fetchDay,
  fetchQueue,
  resolveVideo,
  updateVisit,
} from "../src/api";
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
    expect(callWS.mock.calls.map((call) => call[0])).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/queue" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
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

  it("finds the message of a rejected call", () => {
    expect(errorMessage({ code: "home_assistant_error", message: "SiiPet could not" })).toBe(
      "SiiPet could not",
    );
    expect(errorMessage({ error: { code: "x", message: "nested" } })).toBe("nested");
    expect(errorMessage(new Error("plain"))).toBe("plain");
    expect(errorMessage(undefined)).toBe("The request failed.");
  });
});
