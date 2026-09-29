// Typed calls to the SiiPet websocket commands and actions.

import type { Localization } from "./localize";
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

/** Return a field of a rejected call. A call that fails mid-reconnect nests it under `error`. */
function errorField(err: unknown, name: string): unknown {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }
  if (name in err) {
    return (err as Record<string, unknown>)[name];
  }
  const nested = (err as { error?: unknown }).error;
  return typeof nested === "object" && nested !== null && name in nested
    ? (nested as Record<string, unknown>)[name]
    : undefined;
}

function stringField(err: unknown, name: string): string | undefined {
  const value = errorField(err, name);
  return typeof value === "string" && value !== "" ? value : undefined;
}

function errorTranslationKey(err: unknown): string | undefined {
  return stringField(err, "translation_key");
}

/** A failed call. The card keeps the whole error, so its text follows the language of the card. */
export interface Failure {
  error: unknown;
}

/** Return the text of a rejected call: the SiiPet translation of its key in the language of
 * the card, else its message, else the fallback text of the card. */
export function errorText(err: unknown, l10n: Localization): string {
  const key = errorTranslationKey(err);
  if (key !== undefined && l10n.exceptions && stringField(err, "translation_domain") === "siipet") {
    const placeholders = errorField(err, "translation_placeholders");
    const text = l10n.exceptions(
      `component.siipet.exceptions.${key}.message`,
      typeof placeholders === "object" && placeholders !== null
        ? (placeholders as Record<string, unknown>)
        : undefined,
    );
    if (text) {
      return text;
    }
  }
  return stringField(err, "message") ?? l10n.text.requestFailed;
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
  return (
    stringField(err, "code") === "service_validation_error" &&
    errorTranslationKey(err) !== "not_loaded"
  );
}
