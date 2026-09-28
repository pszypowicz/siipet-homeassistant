// Typed calls to the SiiPet websocket commands and actions.

import type { CalendarResult, CatsResult, DayResult, HomeAssistant, QueueResult } from "./types";

export function fetchCats(hass: HomeAssistant): Promise<CatsResult> {
  return hass.callWS<CatsResult>({ type: "siipet/cats" });
}

export function fetchDay(hass: HomeAssistant, date: string, cat: string): Promise<DayResult> {
  return hass.callWS<DayResult>({ type: "siipet/day", date, cat });
}

export function fetchQueue(hass: HomeAssistant): Promise<QueueResult> {
  return hass.callWS<QueueResult>({ type: "siipet/queue" });
}

export function fetchCalendar(
  hass: HomeAssistant,
  month: string,
  cat: string,
): Promise<CalendarResult> {
  return hass.callWS<CalendarResult>({ type: "siipet/calendar", month, cat });
}

/** Return the signed URL of a visit recording. */
export async function resolveVideo(hass: HomeAssistant, eventId: string): Promise<string> {
  const result = await hass.callWS<{ url: string }>({
    type: "media_source/resolve_media",
    media_content_id: `media-source://siipet/visit/${eventId}`,
  });
  return result.url;
}

// The card shows the error of an action itself, so the frontend toast is off.
export function updateVisit(hass: HomeAssistant, data: Record<string, unknown>): Promise<unknown> {
  return hass.callService("siipet", "update_visit", data, undefined, false);
}

export function deleteVisit(hass: HomeAssistant, eventId: string): Promise<unknown> {
  return hass.callService("siipet", "delete_visit", { event_id: eventId }, undefined, false);
}

function messageOf(value: unknown): string | undefined {
  if (typeof value === "object" && value !== null && "message" in value) {
    const { message } = value as { message: unknown };
    return typeof message === "string" && message !== "" ? message : undefined;
  }
  return undefined;
}

/** Return the text of a rejected call. A call that fails mid-reconnect nests it under `error`. */
export function errorMessage(err: unknown): string {
  const nested =
    typeof err === "object" && err !== null && "error" in err
      ? messageOf((err as { error: unknown }).error)
      : undefined;
  return messageOf(err) ?? nested ?? "The request failed.";
}
