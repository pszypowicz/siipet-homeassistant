import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Visit } from "../src/types";
import {
  CALENDAR,
  catsResult,
  DAY,
  fakeHass,
  type FakeHass,
  find,
  findAll,
  LINGERING,
  mount,
  POOP,
  sent,
  settle,
  stubTileParts,
  type TestCard,
  text,
  UNASSIGNED,
  withState,
} from "./helpers";

beforeAll(async () => {
  stubTileParts();
  await import("../src/siipet-visits-card");
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
  history.replaceState(null, "", "/");
});

interface CardClass {
  new (): HTMLElement & { getGridOptions(): unknown; getCardSize(): number };
  getConfigForm(): {
    schema: unknown[];
    computeLabel(schema: { name: string }): string | undefined;
    computeHelper(schema: { name: string }): string | undefined;
  };
}

function cardClass(): CardClass {
  return customElements.get("siipet-visits-card") as unknown as CardClass;
}

describe("registration", () => {
  it("adds the card to the card picker, with a form and grid sizes", () => {
    const entries = (window as { customCards?: { type: string; name: string }[] }).customCards;
    expect(entries?.find((entry) => entry.type === "siipet-visits-card")?.name).toBe(
      "SiiPet visits",
    );
    const form = cardClass().getConfigForm();
    expect(form.schema).toEqual([
      { name: "cat", selector: { device: { filter: { integration: "siipet", model: "Cat" } } } },
      { name: "hide_cat_picker", selector: { boolean: {} } },
    ]);
    expect(form.computeLabel({ name: "cat" })).toBe("Cat");
    expect(form.computeLabel({ name: "hide_cat_picker" })).toBe("Hide the cat picker");
    expect(form.computeHelper({ name: "cat" })).toBe(
      "Optional. Without a cat, the card starts with the first cat.",
    );
    expect(form.computeHelper({ name: "hide_cat_picker" })).toBe("Keep the card on one cat.");
    expect(new (cardClass())().getGridOptions()).toEqual({
      columns: 12,
      min_columns: 6,
      rows: "auto",
    });
  });

  it("rejects a cat that is not a device id", () => {
    const card = document.createElement("siipet-visits-card") as HTMLElement & {
      setConfig(config: unknown): void;
    };
    expect(() => card.setConfig({ type: "custom:siipet-visits-card", cat: 3 })).toThrow(
      "The cat option must be a device ID.",
    );
  });

  it("rejects a hide_cat_picker that is not a boolean", () => {
    const card = document.createElement("siipet-visits-card") as HTMLElement & {
      setConfig(config: unknown): void;
    };
    expect(() =>
      card.setConfig({ type: "custom:siipet-visits-card", hide_cat_picker: "yes" }),
    ).toThrow("The hide_cat_picker option must be true or false.");
  });
});

describe("day view", () => {
  it("starts with the first cat on the day of the server", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, ".header ha-tile-icon")?.imageUrl).toBe(
      "/api/siipet/image/avatar/p1?authSig=c",
    );
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Luna");
    expect(text(find(card, '.header [slot="secondary"]'))).toBe(
      "Sun 27 Sep · 1 visit · 1 poop · 1 abnormal",
    );
  });

  it("starts with the cat from the config", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-milo" });
    expect(sent(fake)[1]).toEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-milo" });
    expect(find(card, ".header ha-tile-icon")?.icon).toBe("mdi:cat");
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-milo");
  });

  it("starts again when the editor changes the cat", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-milo" });
    await settle(card);
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
  });

  it("clears the error and the open calendar when the editor changes the cat", async () => {
    const fake = fakeHass({ fail: { "siipet/day": { message: "boom" } } });
    const card = await mount(fake);
    find(card, ".date")!.click();
    await settle(card);
    expect(find(card, ".error")).not.toBeNull();
    expect(find(card, ".calendar")).not.toBeNull();

    fake.results.fail = {};
    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-milo" });
    await settle(card);

    expect(find(card, ".error")).toBeNull();
    expect(find(card, ".calendar")).toBeNull();
  });

  it("shows a tile row with a poster for each visit", async () => {
    const card = await mount(fakeHass());
    const rows = findAll(card, ".visit");
    expect(rows).toHaveLength(2);

    const [poop, lingering] = rows;
    expect(text(poop.querySelector('[slot="primary"]'))).toBe("20:11");
    expect(text(poop.querySelector('[slot="secondary"]'))).toBe("Poop · 57 s");
    const icon = poop.querySelector("ha-tile-icon") as HTMLElement & { icon: string };
    expect(icon.icon).toBe("mdi:emoticon-poop");
    expect(icon.style.getPropertyValue("--tile-icon-color")).toBe("var(--brown-color)");
    expect(text(poop.querySelector(".chip"))).toBe("Soft stool");
    expect(poop.querySelector(".cover")?.getAttribute("src")).toBe(POOP.cover);
    expect(poop.querySelector(".stool")?.getAttribute("src")).toBe(POOP.stool);
    expect(poop.querySelector(".camera-only")).toBeNull();

    expect(lingering.classList.contains("lingering")).toBe(true);
    expect(text(lingering.querySelector('[slot="secondary"]'))).toBe("Lingering · 25 s");
    expect(lingering.querySelector(".memo")).not.toBeNull();
    expect(lingering.querySelector(".chip")).toBeNull();
    expect(lingering.querySelector(".cover")).toBeNull();
  });

  it("marks a visit that has no cloud recording", async () => {
    const day = { summary: { visits: 1, pee: 0, poop: 1, abnormal: 0 } };
    const card = await mount(
      fakeHass({ day: { ...day, visits: [{ ...POOP, has_video: false }] } }),
    );
    expect(text(find(card, ".visit .camera-only"))).toBe("On camera only");
  });

  it("shows a day with no visits", async () => {
    const summary = { visits: 0, pee: 0, poop: 0, abnormal: 0 };
    const card = await mount(fakeHass({ day: { summary, visits: [] } }));
    expect(text(find(card, ".empty"))).toBe("No visits on this day.");
    expect(text(find(card, '.header [slot="secondary"]'))).toBe("Sun 27 Sep · 0 visits");
  });

  it("goes back a day and reads the calendar only for a new month", async () => {
    const fake = fakeHass({ cats: catsResult({ today: "2026-10-01" }) });
    const card = await mount(fake);
    expect(find(card, ".next-day")?.disabled).toBe(true);
    fake.callWS.mockClear();

    find(card, ".prev-day")!.click();
    await settle(card);
    expect(sent(fake)).toEqual([
      { type: "siipet/day", date: "2026-09-30", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, ".next-day")?.disabled).toBe(false);
    fake.callWS.mockClear();

    find(card, ".prev-day")!.click();
    await settle(card);
    expect(sent(fake)).toEqual([{ type: "siipet/day", date: "2026-09-29", cat: "dev-luna" }]);
    expect(text(find(card, ".date"))).toBe("Tue 29 Sep");
  });

  it("stops going back at the first day that can open", async () => {
    const fake = fakeHass({ cats: catsResult({ today: "2026-08-29" }) });
    const card = await mount(fake);
    expect(find(card, ".prev-day")?.disabled).toBe(false);
    find(card, ".prev-day")!.click();
    await settle(card);
    expect(text(find(card, ".date"))).toBe("Fri 28 Aug");
    expect(find(card, ".prev-day")?.disabled).toBe(true);
  });

  it("shows a dot on the date of a marked day", async () => {
    const card = await mount(fakeHass({ cats: catsResult({ today: "2026-09-24" }) }));
    expect(find(card, ".date .dot")).not.toBeNull();
  });

  it("opens the calendar and opens a day from it", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    expect(find(card, ".calendar")).toBeNull();
    expect(find(card, ".date .dot")).toBeNull();

    find(card, ".date")!.click();
    await settle(card);
    expect(text(find(card, ".month-name"))).toBe("September 2026");
    expect(findAll(card, ".cell")).toHaveLength(30);
    expect(findAll(card, ".blank")).toHaveLength(1);
    expect(find(card, '.cell[data-date="2026-09-24"] .dot')).not.toBeNull();
    expect(find(card, '.cell[data-date="2026-09-27"]')?.classList.contains("selected")).toBe(true);
    expect(find(card, '.cell[data-date="2026-09-28"]')?.disabled).toBe(true);
    fake.callWS.mockClear();

    find(card, '.cell[data-date="2026-09-24"]')!.click();
    await settle(card);
    expect(sent(fake)).toEqual([{ type: "siipet/day", date: "2026-09-24", cat: "dev-luna" }]);
    expect(find(card, ".calendar")).toBeNull();
    expect(text(find(card, ".date"))).toBe("Thu 24 Sep");
  });

  it("moves the calendar month within the last 12 months", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    find(card, ".date")!.click();
    await settle(card);
    expect(find(card, ".next-month")?.disabled).toBe(true);
    fake.callWS.mockClear();

    find(card, ".prev-month")!.click();
    await settle(card);
    expect(sent(fake)).toEqual([{ type: "siipet/calendar", month: "2026-08", cat: "dev-luna" }]);
    expect(text(find(card, ".month-name"))).toBe("August 2026");

    for (let step = 0; step < 11; step++) {
      find(card, ".prev-month")!.click();
      await settle(card);
    }
    expect(text(find(card, ".month-name"))).toBe("September 2025");
    expect(find(card, ".prev-month")?.disabled).toBe(true);
  });

  it("keeps the oldest open day at the latest calendar answer", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    find(card, ".date")!.click();
    await settle(card);
    find(card, ".prev-month")!.click();
    await settle(card);
    find(card, '.cell[data-date="2026-08-29"]')!.click();
    await settle(card);
    expect(find(card, ".prev-day")?.disabled).toBe(false);

    fake.results.calendar = { ...CALENDAR, first: "2026-08-29" };
    const start = Date.now();
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(start + 31 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    await settle(card);

    expect(find(card, ".prev-day")?.disabled).toBe(true);
  });

  it("switches the cat from the cat strip", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    find(card, "ha-control-select.cats")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "dev-milo" } }),
    );
    await settle(card);
    expect(sent(fake)).toEqual([
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
  });

  it("says so when the account has no cats", async () => {
    const fake = fakeHass({ cats: catsResult({ cats: [] }) });
    const card = await mount(fake);
    expect(text(find(card, ".message"))).toBe("The SiiPet account has no cats.");
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }]);
  });

  it("shows the message of a failed read", async () => {
    const error = { code: "home_assistant_error", message: "SiiPet could not read the visits" };
    const card = await mount(fakeHass({ fail: { "siipet/day": error } }));
    expect(text(find(card, ".error"))).toBe("SiiPet could not read the visits");
  });

  it("shows a notice while SiiPet is not updating", async () => {
    const card = await mount(fakeHass({ cats: catsResult({ available: false }) }));
    expect(text(find(card, ".notice"))).toBe(
      "SiiPet is not updating. Last update: Sun 27 Sep 20:15.",
    );
  });
});

describe("unknown queue", () => {
  const waiting = () => catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } });

  it("offers the Unknown cat only while visits wait", async () => {
    const quiet = await mount(fakeHass());
    const quietOptions = find(quiet, "ha-control-select.cats")?.options as { value: string }[];
    expect(quietOptions.map((option) => option.value)).toEqual(["dev-luna", "dev-milo"]);

    const busy = await mount(fakeHass({ cats: waiting() }));
    const options = find(busy, "ha-control-select.cats")?.options as {
      value: string;
      label: string;
    }[];
    expect(options[2]).toMatchObject({ value: "dev-unknown", label: "Unknown (1)" });
  });

  it("shows the visits without a cat, with the day on each row", async () => {
    const fake = fakeHass({ cats: waiting() });
    const card = await mount(fake);
    fake.callWS.mockClear();

    find(card, "ha-control-select.cats")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "dev-unknown" } }),
    );
    await settle(card);
    expect(sent(fake)).toEqual([{ type: "siipet/queue" }]);
    expect(find(card, ".date-bar")).toBeNull();
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
    expect(text(find(card, '.header [slot="secondary"]'))).toBe("1 visit waiting");
    expect(text(find(card, '.visit [slot="primary"]'))).toBe("Fri 25 Sep 03:12");
  });

  it("starts with the queue for the Unknown cat in the config", async () => {
    const fake = fakeHass({ cats: waiting() });
    await mount(fake, { cat: "dev-unknown" });
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }, { type: "siipet/queue" }]);
  });

  it("uses the Unknown cat when the account has no named cat but has waiting visits", async () => {
    const fake = fakeHass({
      cats: catsResult({ cats: [], unknown: { device_id: "dev-unknown", waiting: 1 } }),
    });
    const card = await mount(fake);
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }, { type: "siipet/queue" }]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
  });

  it("shows the shared empty-queue text on a cat strip card with no cat to switch to", async () => {
    const fake = fakeHass({
      cats: catsResult({ cats: [], unknown: { device_id: "dev-unknown", waiting: 1 } }),
      queue: { visits: [] },
    });
    const card = await mount(fake);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
    expect(text(find(card, ".empty"))).toBe("No visits are waiting.");
  });

  it("goes to the first cat when the queue is empty", async () => {
    const fake = fakeHass({ cats: waiting(), queue: { visits: [] } });
    const card = await mount(fake, { cat: "dev-unknown" });
    expect(sent(fake).slice(2)).toEqual([
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-luna");
    const options = find(card, "ha-control-select.cats")?.options as { value: string }[];
    expect(options.map((option) => option.value)).toEqual(["dev-luna", "dev-milo"]);
  });
});

describe("hide_cat_picker", () => {
  it("hides the cat strip and stays on the configured cat", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
    expect(find(card, "ha-control-select.cats")).toBeNull();
  });

  it("hides the cat strip and reads the first cat without a configured cat", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { hide_cat_picker: true });
    expect(sent(fake)[1]).toEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-luna" });
    expect(find(card, "ha-control-select.cats")).toBeNull();
  });

  it("shows the cat strip again when hide_cat_picker turns off, with a restart", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { hide_cat_picker: true });
    expect(find(card, "ha-control-select.cats")).toBeNull();
    fake.callWS.mockClear();

    card.setConfig({ type: "custom:siipet-visits-card", hide_cat_picker: false });
    await settle(card);
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, "ha-control-select.cats")).not.toBeNull();
  });

  it("restarts and shows the queue when hide_cat_picker turns on for a card that switched away", async () => {
    const fake = fakeHass({
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
      queue: { visits: [] },
    });
    const card = await mount(fake, { cat: "dev-unknown" });
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-luna");
    fake.callWS.mockClear();

    card.setConfig({
      type: "custom:siipet-visits-card",
      cat: "dev-unknown",
      hide_cat_picker: true,
    });
    await settle(card);

    expect(sent(fake)).toEqual([{ type: "siipet/cats" }, { type: "siipet/queue" }]);
    expect(find(card, "ha-control-select.cats")).toBeNull();
    expect(text(find(card, ".empty"))).toBe("No visits are waiting.");
  });

  it("restarts and selects the first cat when hide_cat_picker turns off for a fixed empty queue", async () => {
    const fake = fakeHass({ queue: { visits: [] } });
    const card = await mount(fake, { cat: "dev-unknown", hide_cat_picker: true });
    expect(text(find(card, ".empty"))).toBe("No visits are waiting.");
    fake.callWS.mockClear();

    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-unknown" });
    await settle(card);

    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-luna");
  });

  it("stays on the Unknown queue at start when it is empty", async () => {
    const fake = fakeHass({ queue: { visits: [] } });
    const card = await mount(fake, { cat: "dev-unknown", hide_cat_picker: true });
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }, { type: "siipet/queue" }]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
    expect(text(find(card, ".empty"))).toBe("No visits are waiting.");
    expect(find(card, "ha-control-select.cats")).toBeNull();
  });

  it("stays on the Unknown queue after a refresh finds it empty", async () => {
    const fake = fakeHass({
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
      queue: { visits: [UNASSIGNED] },
    });
    const card = await mount(fake, { cat: "dev-unknown", hide_cat_picker: true });
    expect(findAll(card, ".visit")).toHaveLength(1);

    fake.results.cats = catsResult({ unknown: { device_id: "dev-unknown", waiting: 0 } });
    fake.results.queue = { visits: [] };
    fake.callWS.mockClear();
    fake.listeners.get("ready")!();
    await settle(card);

    expect(sent(fake)).toEqual([{ type: "siipet/cats" }, { type: "siipet/queue" }]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
    expect(text(find(card, ".empty"))).toBe("No visits are waiting.");
  });
});

describe("refresh", () => {
  it("reads again when a visit arrives while the card shows today", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    card.hass = withState(fake.hass, "sensor.outside", "13");
    await settle(card);
    expect(sent(fake)).toEqual([]);

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T19:00:00.000+00:00");
    await settle(card);
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
  });

  it("does not read again for a visit while the card shows another day", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    find(card, ".prev-day")!.click();
    await settle(card);
    fake.callWS.mockClear();

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T19:00:00.000+00:00");
    await settle(card);
    expect(sent(fake)).toEqual([]);
  });

  it("follows the day of the server after midnight", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.results.cats = catsResult({ today: "2026-09-28" });
    fake.callWS.mockClear();

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T22:05:00.000+00:00");
    await settle(card);
    expect(sent(fake).slice(1)).toEqual([
      { type: "siipet/day", date: "2026-09-28", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
  });

  it("reads again when the page shows more than 30 minutes after the last read", async () => {
    const fake = fakeHass();
    const start = Date.now();
    const card = await mount(fake);
    fake.callWS.mockClear();
    const now = vi.spyOn(Date, "now");

    now.mockReturnValue(start + 10 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    await settle(card);
    expect(sent(fake)).toEqual([]);

    now.mockReturnValue(start + 31 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    await settle(card);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("reads again when the connection comes back, and stops listening when removed", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    fake.listeners.get("ready")!();
    await settle(card);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);

    card.remove();
    expect(fake.listeners.has("ready")).toBe(false);
  });

  it("keeps one refresh at a time when ready fires during the first start", async () => {
    const fake = fakeHass();
    let releaseCats!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseCats = resolve)));

    const card = await mount(fake);
    fake.listeners.get("ready")!();
    await settle(card);

    // No second siipet/cats call is in flight while the first answer is held:
    // the ready trigger is queued behind it instead of starting one next to it.
    expect(sent(fake).filter((message) => message.type === "siipet/cats")).toHaveLength(1);

    releaseCats(fake.results.cats);
    await settle(card);

    // The queued ready run reads the cats once more, after the first answer.
    const afterRelease = sent(fake).filter((message) => message.type === "siipet/cats");
    expect(afterRelease).toHaveLength(2);
  });

  it("recovers after a failed first read when the connection comes back", async () => {
    const fake = fakeHass({ fail: { "siipet/cats": { message: "not_loaded" } } });
    const card = await mount(fake);
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }]);
    expect(text(find(card, ".error"))).toBe("not_loaded");

    fake.results.fail = {};
    fake.callWS.mockClear();
    fake.listeners.get("ready")!();
    await settle(card);

    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, ".error")).toBeNull();
  });

  it("keeps the day picked during a refresh instead of jumping to today", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    let releaseCats!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseCats = resolve)));

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T19:00:00.000+00:00");
    await settle(card);

    find(card, ".prev-day")!.click();
    await settle(card);
    expect(text(find(card, ".date"))).toBe("Sat 26 Sep");

    releaseCats(fake.results.cats);
    await settle(card);
    expect(text(find(card, ".date"))).toBe("Sat 26 Sep");
  });

  it("renews the read 50 minutes after the last one while the page stays visible", async () => {
    // Fake timers must be active before the card schedules its renew timer, so
    // enable them before mount and pump them to let mount's own waits resolve.
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    await mounted;
    fake.callWS.mockClear();

    await vi.advanceTimersByTimeAsync(50 * 60 * 1000);

    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("reads again when reattached more than 30 minutes after the last read", async () => {
    const fake = fakeHass();
    const start = Date.now();
    const card = await mount(fake);
    fake.callWS.mockClear();
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(start + 31 * 60 * 1000);

    card.remove();
    document.body.append(card);
    await settle(card);

    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("does not arm a renew timer for a read that lands after the card is removed", async () => {
    // Fake timers from before mount, so a renew timer armed at any point in this
    // test (including the buggy one this guards against) is one we can advance.
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    fake.callWS.mockClear();

    let releaseDay!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseDay = resolve)));

    find(card, ".prev-day")!.click();
    await vi.advanceTimersByTimeAsync(0);
    card.remove();

    releaseDay(fake.results.day);
    await vi.advanceTimersByTimeAsync(0);

    fake.callWS.mockClear();
    await vi.advanceTimersByTimeAsync(50 * 60 * 1000);

    expect(sent(fake)).toEqual([]);
  });

  it("renews on the original schedule after a quick reattach", async () => {
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    fake.callWS.mockClear();

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    card.remove();
    document.body.append(card);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent(fake)).toEqual([]);

    await vi.advanceTimersByTimeAsync(40 * 60 * 1000);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("continues a config change that arrived during the first day read", async () => {
    const fake = fakeHass();
    let releaseDay!: (value: unknown) => void;
    const heldDay = new Promise((resolve) => {
      releaseDay = resolve;
    });
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message.type === "siipet/day" && message.cat === "dev-luna") {
        return heldDay;
      }
      return original(message);
    });

    const card = await mount(fake);
    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-milo" });
    await settle(card);

    releaseDay(fake.results.day);
    await settle(card);

    expect(sent(fake)).toContainEqual({
      type: "siipet/day",
      date: "2026-09-27",
      cat: "dev-milo",
    });
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
  });

  it("keeps the configured cat when the config changes during the cats read of a refresh", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    let releaseCats!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseCats = resolve)));

    fake.listeners.get("ready")!();
    await settle(card);
    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-milo" });
    await settle(card);
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }]);

    releaseCats(fake.results.cats);
    await settle(card);

    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-milo");
  });

  it("queues a refresh for a visit that arrives during an active refresh", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    let releaseCalendar!: (value: unknown) => void;
    const heldCalendar = new Promise((resolve) => {
      releaseCalendar = resolve;
    });
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message.type === "siipet/calendar") {
        return heldCalendar;
      }
      return original(message);
    });

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T19:00:00.000+00:00");
    await settle(card);

    card.hass = withState(fake.hass, "event.luna_visit", "2026-09-27T19:05:00.000+00:00");
    await settle(card);

    releaseCalendar(fake.results.calendar);
    await settle(card);

    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
  });
});

describe("edit view", () => {
  it("clears the editing visit on a config restart", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    findAll(card, ".visit")[0].dispatchEvent(
      new CustomEvent("action", { detail: { action: "tap" } }),
    );
    await settle(card);
    expect(find(card, "siipet-visit-editor")).not.toBeNull();

    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-milo" });
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBeNull();

    // The visit does not reopen once the new cat's day has loaded either.
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBeNull();
  });

  it("shows the error when the account has no cats and a later read fails", async () => {
    const fake = fakeHass({ cats: catsResult({ cats: [] }) });
    const card = await mount(fake);
    expect(find(card, ".message")).not.toBeNull();

    fake.results.fail = { "siipet/cats": { message: "boom" } };
    fake.listeners.get("ready")!();
    await settle(card);

    expect(text(find(card, ".error"))).toBe("boom");
  });
});

describe("open a visit from a link", () => {
  function editing(card: TestCard): Visit | undefined {
    return find(card, "siipet-visit-editor")?.visit as Visit | undefined;
  }

  async function closeEditor(card: TestCard, eventId: string): Promise<void> {
    find(card, "siipet-visit-editor")!.dispatchEvent(
      new CustomEvent("siipet-close", { detail: { changed: false, eventId } }),
    );
    await settle(card);
  }

  // The open editor also resolves the recording, which these tests leave out.
  function reads(fake: FakeHass): Record<string, unknown>[] {
    return sent(fake).filter((message) => String(message.type).startsWith("siipet/"));
  }

  function visitReads(fake: FakeHass): number {
    return sent(fake).filter((message) => message.type === "siipet/visit").length;
  }

  function navigate(path: string, event = "location-changed"): void {
    history.pushState(null, "", path);
    window.dispatchEvent(new Event(event));
  }

  it("opens the linked visit on start and removes only its parameter", async () => {
    history.replaceState(null, "", "/dash?edit=1&siipet_visit=ev-1#visits");
    const fake = fakeHass();
    const card = await mount(fake);
    expect(reads(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
      { type: "siipet/visit", event_id: "ev-1" },
    ]);
    expect(editing(card)?.event_id).toBe("ev-1");
    expect(`${location.pathname}${location.search}${location.hash}`).toBe("/dash?edit=1#visits");
  });

  it("selects the first cat and the day of the visit, then opens it", async () => {
    const shared: Visit = {
      ...POOP,
      cats: [
        { device_id: "dev-milo", name: "Milo" },
        { device_id: "dev-luna", name: "Luna" },
      ],
    };
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    // The day read after the switch does not hold the visit.
    const fake = fakeHass({
      visit: { date: "2026-09-25", visit: shared },
      day: { ...DAY, visits: [LINGERING] },
    });
    const card = await mount(fake);
    expect(reads(fake).slice(3)).toEqual([
      { type: "siipet/visit", event_id: "ev-1" },
      { type: "siipet/day", date: "2026-09-25", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
    expect(editing(card)).toBe(shared);

    await closeEditor(card, "ev-1");
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
    expect(text(find(card, ".date"))).toBe("Fri 25 Sep");
  });

  it("moves a fixed card to the day of a visit of its cat", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass({ visit: { date: "2026-09-25", visit: POOP } });
    const card = await mount(fake, { cat: "dev-luna", hide_cat_picker: true });
    expect(reads(fake).slice(3)).toEqual([
      { type: "siipet/visit", event_id: "ev-1" },
      { type: "siipet/day", date: "2026-09-25", cat: "dev-luna" },
    ]);
    expect(editing(card)?.event_id).toBe("ev-1");

    await closeEditor(card, "ev-1");
    expect(text(find(card, ".date"))).toBe("Fri 25 Sep");
  });

  it("opens a visit without a cat in the Unknown queue", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-9");
    const fake = fakeHass({
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
      visit: { date: "2026-09-25", visit: UNASSIGNED },
    });
    const card = await mount(fake);
    expect(reads(fake).slice(3)).toEqual([
      { type: "siipet/visit", event_id: "ev-9" },
      { type: "siipet/queue" },
    ]);
    expect(editing(card)?.event_id).toBe("ev-9");

    await closeEditor(card, "ev-9");
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Unknown");
  });

  it.each([
    { cat: "dev-luna", visit: POOP, eventId: "ev-1", opens: true },
    { cat: "dev-milo", visit: POOP, eventId: "ev-1", opens: false },
    { cat: "dev-unknown", visit: UNASSIGNED, eventId: "ev-9", opens: true },
    { cat: "dev-luna", visit: UNASSIGNED, eventId: "ev-9", opens: false },
  ])(
    "a card fixed on $cat opens $eventId only when the cat owns it",
    async ({ cat, visit, eventId, opens }) => {
      history.replaceState(null, "", `/dash?siipet_visit=${eventId}`);
      const fake = fakeHass({ visit: { date: "2026-09-27", visit } });
      const card = await mount(fake, { cat, hide_cat_picker: true });
      expect(sent(fake)).toContainEqual({ type: "siipet/visit", event_id: eventId });
      expect(editing(card)?.event_id).toBe(opens ? eventId : undefined);
      expect(location.search).toBe(opens ? "" : `?siipet_visit=${eventId}`);
    },
  );

  it("leaves the link to the card on the page that owns the visit", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    const milo = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    const luna = await mount(fake, { cat: "dev-luna", hide_cat_picker: true });
    expect(editing(milo)).toBeUndefined();
    expect(editing(luna)?.event_id).toBe("ev-1");
    expect(location.search).toBe("");
  });

  it("reads a link once while the address keeps it", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    expect(visitReads(fake)).toBe(1);

    window.dispatchEvent(new Event("location-changed"));
    fake.listeners.get("ready")!();
    await settle(card);
    expect(visitReads(fake)).toBe(1);

    navigate("/dash");
    navigate("/dash?siipet_visit=ev-1");
    await settle(card);
    expect(visitReads(fake)).toBe(2);
  });

  it("reads the link on location-changed and popstate", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    expect(visitReads(fake)).toBe(0);
    fake.callWS.mockClear();

    navigate("/dash?siipet_visit=ev-1");
    await settle(card);
    expect(reads(fake)).toEqual([{ type: "siipet/visit", event_id: "ev-1" }]);
    expect(editing(card)?.event_id).toBe("ev-1");
    expect(location.search).toBe("");

    await closeEditor(card, "ev-1");
    fake.callWS.mockClear();
    navigate("/dash?siipet_visit=ev-1", "popstate");
    await settle(card);
    expect(reads(fake)).toEqual([{ type: "siipet/visit", event_id: "ev-1" }]);
    expect(editing(card)?.event_id).toBe("ev-1");
  });

  it("follows a link that arrives while a read runs", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    let releaseCats!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseCats = resolve)));
    fake.listeners.get("ready")!();
    await settle(card);

    navigate("/dash?siipet_visit=ev-1");
    await settle(card);
    expect(visitReads(fake)).toBe(0);

    releaseCats(fake.results.cats);
    await settle(card);
    expect(visitReads(fake)).toBe(1);
    expect(editing(card)?.event_id).toBe("ev-1");
  });

  it("follows a link that arrived while the card was detached", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    card.remove();
    navigate("/dash?siipet_visit=ev-1");
    await settle();
    expect(visitReads(fake)).toBe(0);

    document.body.append(card);
    await settle(card);
    expect(visitReads(fake)).toBe(1);
    expect(editing(card)?.event_id).toBe("ev-1");
  });

  it("does not open a visit when the address moves on during the read", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    let releaseVisit!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseVisit = resolve)));

    navigate("/dash?siipet_visit=ev-1");
    await settle(card);
    navigate("/dash/other");
    releaseVisit(fake.results.visit);
    await settle(card);

    expect(editing(card)).toBeUndefined();
    expect(location.pathname).toBe("/dash/other");
  });

  it("reads the link again when the config changes during the read", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    let releaseVisit: ((value: unknown) => void) | undefined;
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message.type === "siipet/visit" && releaseVisit === undefined) {
        return new Promise((resolve) => (releaseVisit = resolve));
      }
      return original(message);
    });

    const card = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-luna", hide_cat_picker: true });
    await settle(card);
    releaseVisit!(fake.results.visit);
    await settle(card);

    expect(visitReads(fake)).toBe(2);
    expect(editing(card)?.event_id).toBe("ev-1");
  });

  it("shows the message of a failed visit read", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-99");
    const error = {
      code: "service_validation_error",
      message: "SiiPet has no visit ev-99 in the last 7 days",
    };
    const card = await mount(fakeHass({ fail: { "siipet/visit": error } }));
    expect(text(find(card, ".error"))).toBe("SiiPet has no visit ev-99 in the last 7 days");
    expect(editing(card)).toBeUndefined();
    expect(location.search).toBe("?siipet_visit=ev-99");
  });
});
