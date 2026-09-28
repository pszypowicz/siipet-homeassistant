// Typed calls to the SiiPet websocket commands and actions.

import type {
  CalendarResult,
  CatsResult,
  DayResult,
  HomeAssistant,
  QueueResult,
  VisitResult,
} from "./types";

export function fetchCats(hass: HomeAssistant): Promise<CatsResult> {
  return hass.callWS<CatsResult>({ type: "siipet/cats" });
}

export function fetchDay(hass: HomeAssistant, date: string, cat: string): Promise<DayResult> {
  return hass.callWS<DayResult>({ type: "siipet/day", date, cat });
}

export function fetchQueue(hass: HomeAssistant): Promise<QueueResult> {
  return hass.callWS<QueueResult>({ type: "siipet/queue" });
}

export function fetchVisit(hass: HomeAssistant, eventId: string): Promise<VisitResult> {
  return hass.callWS<VisitResult>({ type: "siipet/visit", event_id: eventId });
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

function translationKeyOf(value: unknown): string | undefined {
  if (typeof value === "object" && value !== null && "translation_key" in value) {
    const { translation_key } = value as { translation_key: unknown };
    return typeof translation_key === "string" ? translation_key : undefined;
  }
  return undefined;
}

function codeOf(value: unknown): string | undefined {
  if (typeof value === "object" && value !== null && "code" in value) {
    const { code } = value as { code: unknown };
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Return the code of a rejected call, also when it is nested under `error`. */
function errorCode(err: unknown): string | undefined {
  const nested =
    typeof err === "object" && err !== null && "error" in err
      ? codeOf((err as { error: unknown }).error)
      : undefined;
  return codeOf(err) ?? nested;
}

/** Return the text of a rejected call. A call that fails mid-reconnect nests it under `error`. */
export function errorMessage(err: unknown): string {
  const nested =
    typeof err === "object" && err !== null && "error" in err
      ? messageOf((err as { error: unknown }).error)
      : undefined;
  return messageOf(err) ?? nested ?? "The request failed.";
}

/** Return the translation key of a rejected call, also when it is nested under `error`. */
function errorTranslationKey(err: unknown): string | undefined {
  const nested =
    typeof err === "object" && err !== null && "error" in err
      ? translationKeyOf((err as { error: unknown }).error)
      : undefined;
  return translationKeyOf(err) ?? nested;
}

// A pee visit reassign runs an operation that assumes poop, then one that
// reverts it. If the revert fails, `update_visit` fails with this key and the
// server keeps the assumed type, so a retry must send the type explicitly.
export function isPartialEdit(err: unknown): boolean {
  return errorTranslationKey(err) === "edit_partial";
}

// `siipet/visit` fails with this key for an event id that the 7-day window does not hold.
export function isOutsideWindow(err: unknown): boolean {
  return errorTranslationKey(err) === "visit_not_in_window";
}

// A validation error stays the same on every retry, for example a day out of range
// or a cat the account no longer has, so a retry never recovers from it. `not_loaded`
// is the exception: the entry is still starting up and clears it once it loads.
export function isPermanentFailure(err: unknown): boolean {
  return errorCode(err) === "service_validation_error" && errorTranslationKey(err) !== "not_loaded";
}
