// Stub tile parts, fixture results, and a fake `hass` for the card tests.

import { vi } from "vitest";

import { TILE_PARTS } from "../src/tile-parts";
import type {
  CalendarResult,
  CardConfig,
  CatsResult,
  DayResult,
  FrontendLocale,
  HomeAssistant,
  QueueResult,
  Visit,
  VisitResult,
} from "../src/types";

/** Define every tile part as a plain element, except the parts in `skip`. */
export function stubTileParts(skip: string[] = []): void {
  for (const name of TILE_PARTS) {
    if (!skip.includes(name) && !customElements.get(name)) {
      customElements.define(name, class extends HTMLElement {});
    }
  }
  (window as { loadCardHelpers?: () => Promise<unknown> }).loadCardHelpers = async () => ({});
}

/** Stubs window.loadCardHelpers to resolve a delete confirmation dialog to `result`. */
export function stubConfirmationDialog(result: boolean): ReturnType<typeof vi.fn> {
  const showConfirmationDialog = vi.fn().mockResolvedValue(result);
  (
    window as unknown as { loadCardHelpers: () => Promise<{ showConfirmationDialog: unknown }> }
  ).loadCardHelpers = async () => ({ showConfirmationDialog });
  return showConfirmationDialog;
}

export const POOP: Visit = {
  event_id: "ev-1",
  start: "2026-09-27T20:11:00+02:00",
  duration: 57,
  type: "poop",
  cats: [{ device_id: "dev-luna", name: "Luna" }],
  camera: "Bathroom",
  note: "",
  abnormal: true,
  abnormal_reasons: ["Soft stool"],
  has_video: true,
  has_stool_image: true,
  cover: "/api/siipet/image/cover/ev-1?authSig=a",
  stool: "/api/siipet/image/stool/ev-1?authSig=b",
};

export const LINGERING: Visit = {
  ...POOP,
  event_id: "ev-2",
  start: "2026-09-27T07:46:00+02:00",
  duration: 25,
  type: "lingering",
  camera: null,
  note: "checked",
  abnormal: false,
  abnormal_reasons: [],
  has_stool_image: false,
  cover: null,
  stool: null,
};

export const UNASSIGNED: Visit = {
  ...POOP,
  event_id: "ev-9",
  start: "2026-09-25T03:12:00+02:00",
  type: "unknown",
  cats: [],
  abnormal: false,
  abnormal_reasons: [],
  has_stool_image: false,
  stool: null,
};

export function catsResult(overrides: Partial<CatsResult> = {}): CatsResult {
  return {
    cats: [
      { device_id: "dev-luna", name: "Luna", avatar: "/api/siipet/image/avatar/p1?authSig=c" },
      { device_id: "dev-milo", name: "Milo", avatar: null },
    ],
    unknown: { device_id: "dev-unknown", waiting: 0 },
    today: "2026-09-27",
    available: true,
    updated_at: "2026-09-27T20:15:00+02:00",
    ...overrides,
  };
}

export const DAY: DayResult = {
  summary: { visits: 1, pee: 0, poop: 1, abnormal: 1 },
  visits: [POOP, LINGERING],
};

export const CALENDAR: CalendarResult = {
  days: {
    "2026-09-24": { visits: 5, abnormal: 0, marked: true },
    "2026-09-27": { visits: 1, abnormal: 1, marked: false },
  },
  first: "2026-08-28",
  last: "2026-09-27",
};

export interface FakeResults {
  cats: CatsResult;
  day: DayResult;
  calendar: CalendarResult;
  queue: QueueResult;
  visit: VisitResult;
  /** Websocket command type to the error that the call rejects with. */
  fail: Record<string, unknown>;
}

export interface FakeHass {
  hass: HomeAssistant;
  results: FakeResults;
  callWS: ReturnType<typeof vi.fn>;
  callService: ReturnType<typeof vi.fn>;
  loadBackendTranslation: ReturnType<typeof vi.fn>;
  listeners: Map<string, () => void>;
}

/** A fake `hass` that answers the SiiPet commands from `results`, which tests can change. */
export function fakeHass(overrides: Partial<FakeResults> = {}, admin = true): FakeHass {
  const results: FakeResults = {
    cats: catsResult(),
    day: DAY,
    calendar: CALENDAR,
    queue: { visits: [UNASSIGNED] },
    visit: { date: "2026-09-27", visit: POOP },
    fail: {},
    ...overrides,
  };
  const listeners = new Map<string, () => void>();
  const callWS = vi.fn(async (message: Record<string, unknown>) => {
    const type = String(message.type);
    if (type in results.fail) {
      throw results.fail[type];
    }
    switch (type) {
      case "siipet/cats":
        return results.cats;
      case "siipet/day":
        return results.day;
      case "siipet/calendar":
        return results.calendar;
      case "siipet/queue":
        return results.queue;
      case "siipet/visit":
        return results.visit;
      case "media_source/resolve_media":
        return { url: "https://video.example/ev-1.mp4", mime_type: "video/mp4" };
    }
    throw new Error(`unexpected ${type}`);
  });
  const callService = vi.fn().mockResolvedValue(undefined);
  // SiiPet exception texts by language, as Home Assistant loads them. The card
  // calls the loader with its `hass` as `this`, so the fake answers by that
  // language, like Home Assistant does. A key outside the three below gives "".
  const EXCEPTION_TEXTS: Record<
    string,
    Record<string, (values?: Record<string, unknown>) => string>
  > = {
    pl: {
      "component.siipet.exceptions.not_loaded.message": () =>
        "SiiPet nie jest załadowany. Sprawdź integrację SiiPet.",
      "component.siipet.exceptions.date_out_of_range.message": (values) =>
        `Wybierz datę od ${values?.first} do ${values?.last}.`,
      "component.siipet.exceptions.edit_partial.message": (values) =>
        `SiiPet mógł nie zastosować całej zmiany wizyty ${values?.event_id}: ${values?.error}. Sprawdź wizytę, a potem wywołaj akcję ponownie z typem ${values?.type}.`,
    },
    en: {
      "component.siipet.exceptions.not_loaded.message": () =>
        "SiiPet is not loaded. Check the SiiPet integration.",
      "component.siipet.exceptions.date_out_of_range.message": (values) =>
        `Choose a date from ${values?.first} to ${values?.last}.`,
      "component.siipet.exceptions.edit_partial.message": (values) =>
        `SiiPet may not have applied the whole change to visit ${values?.event_id}: ${values?.error}. Check the visit, then call the action again with type ${values?.type}.`,
    },
  };
  const loadBackendTranslation = vi.fn(async function (this: HomeAssistant | undefined) {
    const table = EXCEPTION_TEXTS[this?.language === "pl" ? "pl" : "en"];
    return (key: string, values?: Record<string, unknown>) => table[key]?.(values) ?? "";
  });
  const hass = {
    states: {
      "event.luna_visit": {
        entity_id: "event.luna_visit",
        state: "2026-09-27T18:11:00.000+00:00",
        last_changed: "",
      },
      "sensor.outside": { entity_id: "sensor.outside", state: "12", last_changed: "" },
    },
    entities: {
      "event.luna_visit": {
        entity_id: "event.luna_visit",
        platform: "siipet",
        device_id: "dev-luna",
      },
      "sensor.outside": { entity_id: "sensor.outside", platform: "met" },
    },
    user: { is_admin: admin },
    // An English profile with 24-hour times and Monday first, so the times and
    // the calendar read like the fixtures.
    language: "en",
    locale: { language: "en", time_format: "24", first_weekday: "monday" },
    connection: {
      addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
      removeEventListener: (event: string, listener: () => void) => {
        if (listeners.get(event) === listener) {
          listeners.delete(event);
        }
      },
    },
    callWS,
    callService,
    loadBackendTranslation,
  } as unknown as HomeAssistant;
  return { hass, results, callWS, callService, loadBackendTranslation, listeners };
}

/** A copy of `hass` with a new state for one entity, as Home Assistant sends it. */
export function withState(hass: HomeAssistant, entityId: string, state: string): HomeAssistant {
  return {
    ...hass,
    states: { ...hass.states, [entityId]: { entity_id: entityId, state, last_changed: "" } },
  };
}

/** A copy of `hass` with other profile locale settings, as Home Assistant sends it. */
export function withLocale(hass: HomeAssistant, locale: Partial<FrontendLocale>): HomeAssistant {
  const next = { ...hass.locale!, ...locale };
  return { ...hass, language: next.language, locale: next };
}

export interface TestCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: CardConfig): void;
  updateComplete: Promise<boolean>;
}

/** Wait for pending promises and Lit updates. */
export async function settle(card?: TestCard): Promise<void> {
  for (let round = 0; round < 5; round++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (card) {
      await card.updateComplete;
    }
  }
}

/** Create the card with `config`, attach it, and wait until it shows its data. */
export async function mount(fake: FakeHass, config: Partial<CardConfig> = {}): Promise<TestCard> {
  const card = document.createElement("siipet-visits-card") as TestCard;
  card.setConfig({ type: "custom:siipet-visits-card", ...config });
  card.hass = fake.hass;
  document.body.append(card);
  await settle(card);
  return card;
}

/** The websocket messages sent so far. */
export function sent(fake: FakeHass): Record<string, unknown>[] {
  return fake.callWS.mock.calls.map((call) => call[0] as Record<string, unknown>);
}

type Part = HTMLElement & Record<string, unknown>;

export function find(card: TestCard, selector: string): Part | null {
  return card.shadowRoot!.querySelector(selector) as Part | null;
}

export function findAll(card: TestCard, selector: string): Part[] {
  return [...card.shadowRoot!.querySelectorAll(selector)] as Part[];
}

/** The text of an element with the white space collapsed. */
export function text(element: Element | null | undefined): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}
