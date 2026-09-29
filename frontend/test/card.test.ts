import { render } from "lit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cardStyles } from "../src/styles";
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
  stubConfirmationDialog,
  stubTileParts,
  type TestCard,
  text,
  UNASSIGNED,
  withLocale,
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

type Part = HTMLElement & Record<string, unknown>;

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
      "Sun, Sep 27 · 1 visit · 1 poop · 1 abnormal",
    );
  });

  it("starts with the cat from the config", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-milo" });
    expect(sent(fake)[1]).toEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-milo" });
    expect(find(card, ".header ha-tile-icon")?.icon).toBe("mdi:cat");
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-milo");
  });

  it("renders each cat's name next to its avatar or icon in one row", async () => {
    const card = await mount(fakeHass());
    const options = find(card, "ha-control-select.cats")?.options as {
      value: string;
      label?: string;
      ariaLabel?: string;
      icon: unknown;
    }[];
    const [luna, milo] = options;
    expect(luna.label).toBeUndefined();
    expect(luna.ariaLabel).toBe("Luna");
    expect(milo.ariaLabel).toBe("Milo");

    const lunaContainer = document.createElement("div");
    render(luna.icon, lunaContainer);
    expect(text(lunaContainer)).toBe("Luna");
    expect(lunaContainer.querySelector("img")?.getAttribute("src")).toBe(
      "/api/siipet/image/avatar/p1?authSig=c",
    );

    const miloContainer = document.createElement("div");
    render(milo.icon, miloContainer);
    expect(text(miloContainer)).toBe("Milo");
    expect(miloContainer.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:cat");
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
    expect(text(poop.querySelector('[slot="secondary"]'))).toBe("Poop · 57 s · Bathroom");
    const icon = poop.querySelector("ha-tile-icon") as HTMLElement & { icon: string };
    expect(icon.icon).toBe("mdi:emoticon-poop");
    expect(icon.style.getPropertyValue("--tile-icon-color")).toBe("var(--brown-color)");
    expect(text(poop.querySelector(".chip"))).toBe("Soft stool");
    expect(poop.querySelector(".cover")?.getAttribute("src")).toBe(POOP.cover);
    expect(poop.querySelector(".poster .stool")).toBeNull();
    expect(text(poop.querySelector(".stool-row .stool-label"))).toBe("Stool photo");
    expect(poop.querySelector(".stool-row .stool")?.getAttribute("src")).toBe(POOP.stool);
    expect(poop.querySelector(".camera-only")).toBeNull();

    expect(lingering.classList.contains("lingering")).toBe(true);
    expect(text(lingering.querySelector('[slot="secondary"]'))).toBe("Lingering · 25 s");
    expect(lingering.querySelector(".memo")).not.toBeNull();
    expect(lingering.querySelector(".chip")).toBeNull();
    expect(lingering.querySelector(".cover")).toBeNull();
    expect(lingering.querySelector(".stool-row")).toBeNull();
  });

  it("puts the camera after the memo icon, so a long camera name cuts off first", async () => {
    const card = await mount(fakeHass({ day: { ...DAY, visits: [{ ...POOP, note: "soft" }] } }));
    const secondary = find(card, '.visit [slot="secondary"]')!;

    expect(text(secondary)).toBe("Poop · 57 s · Bathroom");
    const markup = secondary.innerHTML;
    expect(markup.indexOf('class="memo"')).toBeGreaterThan(-1);
    expect(markup.indexOf('class="memo"')).toBeLessThan(markup.indexOf("Bathroom"));
  });

  it("wraps the poster so its background stays inside the row instead of the tile padding", async () => {
    const card = await mount(fakeHass());
    const [poop] = findAll(card, ".visit");
    const slot = poop.querySelector('[slot="features"]');
    expect(slot?.classList.contains("poster-slot")).toBe(true);
    const poster = slot?.querySelector(".poster");
    expect(poster).not.toBeNull();
    expect(poster?.querySelector(".cover")?.getAttribute("src")).toBe(POOP.cover);
  });

  it("gives the poster a 16:9 box filled from the middle of the cover", () => {
    const posterRule = cardStyles.cssText.match(/\.poster\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(posterRule).toMatch(/aspect-ratio:\s*16 \/ 9/);
    const coverRule = cardStyles.cssText.match(/\.cover\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(coverRule).toMatch(/object-fit:\s*cover/);
    expect(coverRule).toMatch(/object-position:\s*center/);
  });

  it("shows the stool photo whole as a small thumbnail below the poster", () => {
    const stoolRule = cardStyles.cssText.match(/\.stool\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(stoolRule).toMatch(/height:\s*56px/);
    expect(stoolRule).toMatch(/width:\s*auto/);
    expect(stoolRule).toMatch(/object-fit:\s*contain/);
    expect(stoolRule).not.toMatch(/position:\s*absolute/);
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
    expect(text(find(card, '.header [slot="secondary"]'))).toBe("Sun, Sep 27 · 0 visits");
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
    expect(text(find(card, ".date"))).toBe("Tue, Sep 29");
  });

  it("stops going back at the first day that can open", async () => {
    const fake = fakeHass({ cats: catsResult({ today: "2026-08-29" }) });
    const card = await mount(fake);
    expect(find(card, ".prev-day")?.disabled).toBe(false);
    find(card, ".prev-day")!.click();
    await settle(card);
    expect(text(find(card, ".date"))).toBe("Fri, Aug 28");
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
    expect(text(find(card, ".date"))).toBe("Thu, Sep 24");
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

  it("keeps the value-changed event of the cat strip inside the card", async () => {
    const card = await mount(fakeHass());
    const heard = vi.fn();
    document.addEventListener("value-changed", heard);
    try {
      find(card, "ha-control-select.cats")!.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: "dev-milo" },
          bubbles: true,
          composed: true,
        }),
      );
      await settle(card);
    } finally {
      document.removeEventListener("value-changed", heard);
    }
    expect(heard).not.toHaveBeenCalled();
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
  });

  it("shows the error when the card helpers do not load, and starts on the next try", async () => {
    const helpers = vi
      .spyOn(window as unknown as { loadCardHelpers: () => Promise<unknown> }, "loadCardHelpers")
      .mockRejectedValueOnce(new Error("The card helpers did not load"));
    const fake = fakeHass();
    const card = await mount(fake);
    expect(text(find(card, ".error"))).toBe("The card helpers did not load");
    expect(fake.callWS).not.toHaveBeenCalled();

    fake.listeners.get("ready")!();
    await settle(card);
    expect(helpers).toHaveBeenCalledTimes(2);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
    expect(find(card, ".error")).toBeNull();
  });

  it("shows the message of a failure inside a run", async () => {
    const prototype = cardClass().prototype as unknown as { _followLink(): Promise<void> };
    vi.spyOn(prototype, "_followLink").mockRejectedValue(new Error("boom"));
    const card = await mount(fakeHass());
    expect(text(find(card, ".error"))).toBe("boom");
  });

  it("does not render again or read for a hass update that changes another entity", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    const options = find(card, "ha-control-select.cats")!.options;
    const render = vi.spyOn(cardClass().prototype as unknown as { render(): unknown }, "render");
    fake.callWS.mockClear();

    card.hass = withState(fake.hass, "sensor.outside", "13");
    await settle(card);

    expect(render).not.toHaveBeenCalled();
    expect(find(card, "ha-control-select.cats")!.options).toBe(options);
    expect(sent(fake)).toEqual([]);
  });

  it("reads again when a new SiiPet event entity appears while the card shows today", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    fake.callWS.mockClear();

    card.hass = {
      ...fake.hass,
      entities: {
        ...fake.hass.entities,
        "event.milo_visit": {
          entity_id: "event.milo_visit",
          platform: "siipet",
          device_id: "dev-milo",
        },
      },
      states: {
        ...fake.hass.states,
        "event.milo_visit": {
          entity_id: "event.milo_visit",
          state: "2026-09-27T19:00:00.000+00:00",
          last_changed: "",
        },
      },
    };
    await settle(card);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
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
      "SiiPet is not updating. Last update: Sun, Sep 27 20:15.",
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
      ariaLabel: string;
    }[];
    expect(options[2]).toMatchObject({ value: "dev-unknown", ariaLabel: "Unknown (1)" });
  });

  it("renders the Unknown option's icon and name in one row", async () => {
    const busy = await mount(fakeHass({ cats: waiting() }));
    const options = find(busy, "ha-control-select.cats")?.options as {
      value: string;
      label?: string;
      icon: unknown;
    }[];
    const unknown = options[2];
    expect(unknown.label).toBeUndefined();

    const container = document.createElement("div");
    render(unknown.icon, container);
    expect(text(container)).toBe("Unknown (1)");
    expect(container.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:help");
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
    expect(text(find(card, '.visit [slot="primary"]'))).toBe("Fri, Sep 25 03:12");
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

  it("says so and reads nothing more when the cat of a fixed card is not in the account", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-gone", hide_cat_picker: true });
    expect(text(find(card, ".message"))).toBe("The cat of this card is not in the SiiPet account.");
    expect(sent(fake)).toEqual([{ type: "siipet/cats" }]);
    expect(find(card, "siipet-visit-editor")).toBeNull();
    expect(location.search).toBe("?siipet_visit=ev-1");
  });

  it("starts a card with the cat strip on the first cat when its cat is not in the account", async () => {
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-gone" });
    expect(sent(fake)[1]).toEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-luna" });
    expect(find(card, "ha-control-select.cats")?.value).toBe("dev-luna");
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

  it("starts when a SiiPet entity changes after a failed first read", async () => {
    const fake = fakeHass({ fail: { "siipet/cats": { message: "SiiPet is not loaded" } } });
    const card = await mount(fake);
    expect(text(find(card, ".error"))).toBe("SiiPet is not loaded");

    // The entry loads, and its event entity gets a state.
    fake.results.fail = {};
    fake.callWS.mockClear();
    card.hass = withState(fake.hass, "event.luna_visit", "unknown");
    await settle(card);

    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, ".error")).toBeNull();
  });

  it.each(["siipet/cats", "siipet/day"])(
    "tries again 5 minutes after the %s read of a renewal fails",
    async (failing) => {
      vi.useFakeTimers();
      const fake = fakeHass();
      const mounted = mount(fake);
      await vi.advanceTimersByTimeAsync(1000);
      const card = await mounted;
      // A past day ignores visit events, so only the timer reads it again.
      find(card, ".prev-day")!.click();
      await vi.advanceTimersByTimeAsync(0);

      fake.results.fail = { [failing]: { message: "boom" } };
      await vi.advanceTimersByTimeAsync(50 * 60 * 1000);
      expect(text(find(card, ".error"))).toBe("boom");

      fake.results.fail = {};
      fake.callWS.mockClear();
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(sent(fake)).toEqual([
        { type: "siipet/cats" },
        { type: "siipet/day", date: "2026-09-26", cat: "dev-luna" },
        { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
      ]);
      expect(find(card, ".error")).toBeNull();
    },
  );

  it("does not retry after a renewal fails with a permanent validation error", async () => {
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    // A past day ignores visit events, so only the timer reads it again.
    find(card, ".prev-day")!.click();
    await vi.advanceTimersByTimeAsync(0);

    fake.results.fail = {
      "siipet/day": {
        code: "service_validation_error",
        translation_key: "date_out_of_range",
        message: "That day is out of range.",
      },
    };
    await vi.advanceTimersByTimeAsync(50 * 60 * 1000);
    expect(text(find(card, ".error"))).toBe("That day is out of range.");

    fake.callWS.mockClear();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(sent(fake)).toEqual([]);
  });

  it("retries after a renewal fails with the not_loaded validation error", async () => {
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    find(card, ".prev-day")!.click();
    await vi.advanceTimersByTimeAsync(0);

    fake.results.fail = {
      "siipet/day": {
        code: "service_validation_error",
        translation_key: "not_loaded",
        message: "SiiPet is not loaded. Check the SiiPet integration",
      },
    };
    await vi.advanceTimersByTimeAsync(50 * 60 * 1000);
    expect(text(find(card, ".error"))).toBe("SiiPet is not loaded. Check the SiiPet integration");

    fake.results.fail = {};
    fake.callWS.mockClear();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(sent(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-26", cat: "dev-luna" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-luna" },
    ]);
    expect(find(card, ".error")).toBeNull();
  });

  it("tries again 5 minutes after a failed first read", async () => {
    vi.useFakeTimers();
    const fake = fakeHass({ fail: { "siipet/cats": { message: "SiiPet is not loaded" } } });
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    expect(text(find(card, ".error"))).toBe("SiiPet is not loaded");

    fake.results.fail = {};
    fake.callWS.mockClear();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("tries again when the page shows after the retry time passed while it was hidden", async () => {
    vi.useFakeTimers();
    const fake = fakeHass({ fail: { "siipet/cats": { message: "SiiPet is not loaded" } } });
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    fake.results.fail = {};
    fake.callWS.mockClear();

    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(sent(fake)).toEqual([]);

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Luna");
  });

  it("keeps the retry of a failed read across a reattach", async () => {
    vi.useFakeTimers();
    const fake = fakeHass({ fail: { "siipet/cats": { message: "SiiPet is not loaded" } } });
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;
    fake.results.fail = {};
    fake.callWS.mockClear();

    card.remove();
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(sent(fake)).toEqual([]);

    document.body.append(card);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("renews 50 minutes after the older of the cats read and the day read", async () => {
    vi.useFakeTimers();
    const fake = fakeHass();
    const mounted = mount(fake);
    await vi.advanceTimersByTimeAsync(1000);
    const card = await mounted;

    // A day read 20 minutes later does not renew the avatar paths of the cats read.
    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    find(card, ".prev-day")!.click();
    await vi.advanceTimersByTimeAsync(0);
    fake.callWS.mockClear();

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(sent(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
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
    expect(text(find(card, ".date"))).toBe("Sat, Sep 26");

    releaseCats(fake.results.cats);
    await settle(card);
    expect(text(find(card, ".date"))).toBe("Sat, Sep 26");
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

describe("answers out of order", () => {
  /** Hold the next call of `type`, and return a function that answers it. */
  function holdNext(fake: FakeHass, type: string): (value: unknown) => void {
    let release: ((value: unknown) => void) | undefined;
    let waiting = true;
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (waiting && message.type === type) {
        waiting = false;
        return new Promise((resolve) => (release = resolve));
      }
      return original(message);
    });
    return (value) => release!(value);
  }

  function shownEvents(card: TestCard): string[] {
    return findAll(card, ".visit").map((row) => row.dataset.event!);
  }

  it("does not bring back a deleted visit with an old answer for the same day", async () => {
    stubConfirmationDialog(true);
    const fake = fakeHass();
    const card = await mount(fake);
    find(card, ".prev-day")!.click();
    await settle(card);

    const releaseOld = holdNext(fake, "siipet/day");
    find(card, ".next-day")!.click();
    await settle(card);
    find(card, ".prev-day")!.click();
    await settle(card);
    find(card, ".next-day")!.click();
    await settle(card);
    expect(shownEvents(card)).toEqual(["ev-1", "ev-2"]);

    fake.results.day = {
      summary: { visits: 0, pee: 0, poop: 0, abnormal: 0 },
      visits: [LINGERING],
    };
    findAll(card, ".visit")[0].dispatchEvent(
      new CustomEvent("action", { detail: { action: "tap" } }),
    );
    await settle(card);
    const editor = find(card, "siipet-visit-editor")!;
    (editor.shadowRoot!.querySelector(".delete") as HTMLElement).click();
    await settle(card);
    expect(shownEvents(card)).toEqual(["ev-2"]);

    releaseOld(DAY);
    await settle(card);
    expect(shownEvents(card)).toEqual(["ev-2"]);
  });

  it("applies only the latest queue answer", async () => {
    const newer: Visit = { ...UNASSIGNED, event_id: "ev-8" };
    const fake = fakeHass({
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
    });
    const card = await mount(fake);
    const select = (cat: string) =>
      find(card, "ha-control-select.cats")!.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: cat } }),
      );

    const releaseOld = holdNext(fake, "siipet/queue");
    select("dev-unknown");
    await settle(card);
    select("dev-luna");
    await settle(card);
    fake.results.queue = { visits: [newer] };
    select("dev-unknown");
    await settle(card);
    expect(shownEvents(card)).toEqual(["ev-8"]);

    releaseOld({ visits: [UNASSIGNED] });
    await settle(card);
    expect(shownEvents(card)).toEqual(["ev-8"]);
  });

  it("applies only the latest calendar answer of a month", async () => {
    const august = (marked: boolean) => ({
      days: { "2026-08-24": { visits: 1, abnormal: marked ? 1 : 0, marked } },
      first: "2026-08-28",
      last: "2026-09-27",
    });
    const fake = fakeHass();
    const card = await mount(fake);
    find(card, ".date")!.click();
    await settle(card);

    const releaseOld = holdNext(fake, "siipet/calendar");
    find(card, ".prev-month")!.click();
    await settle(card);
    find(card, ".next-month")!.click();
    await settle(card);
    fake.results.calendar = august(false);
    find(card, ".prev-month")!.click();
    await settle(card);
    expect(find(card, '.cell[data-date="2026-08-24"] .dot')).toBeNull();

    releaseOld(august(true));
    await settle(card);
    expect(find(card, '.cell[data-date="2026-08-24"] .dot')).toBeNull();
  });
});

describe("a change in another card", () => {
  function reads(fake: FakeHass): Record<string, unknown>[] {
    return sent(fake).filter((message) => String(message.type).startsWith("siipet/"));
  }

  function inEditor(editor: HTMLElement, selector: string): Part | null {
    return editor.shadowRoot!.querySelector(selector) as Part | null;
  }

  async function openFirstVisit(card: TestCard): Promise<HTMLElement> {
    findAll(card, ".visit")[0].dispatchEvent(
      new CustomEvent("action", { detail: { action: "tap" } }),
    );
    await settle(card);
    return find(card, "siipet-visit-editor")!;
  }

  async function change(card: TestCard, action: "save" | "delete"): Promise<void> {
    const editor = await openFirstVisit(card);
    if (action === "save") {
      inEditor(editor, "ha-control-select.type")!.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: "pee" } }),
      );
      await settle(card);
      inEditor(editor, ".save")!.click();
    } else {
      inEditor(editor, ".delete")!.click();
    }
  }

  it.each(["save", "delete"] as const)(
    "reads again in the other cards after a %s",
    async (action) => {
      stubConfirmationDialog(true);
      const fake = fakeHass();
      const luna = await mount(fake);
      const milo = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
      fake.callWS.mockClear();

      await change(luna, action);
      await settle(luna);
      await settle(milo);

      const all = reads(fake);
      expect(all.filter((message) => message.type === "siipet/cats")).toHaveLength(2);
      expect(all).toContainEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-milo" });
      expect(all).toContainEqual({ type: "siipet/day", date: "2026-09-27", cat: "dev-luna" });
    },
  );

  it("reads again when a card that was away during a save shows again", async () => {
    const fake = fakeHass();
    let releaseSave!: (value?: unknown) => void;
    fake.callService.mockImplementationOnce(
      () => new Promise((resolve) => (releaseSave = resolve)),
    );
    const luna = await mount(fake);
    const milo = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });

    await change(luna, "save");
    await settle(luna);
    milo.remove();
    releaseSave();
    await settle(luna);
    await settle(milo);
    fake.callWS.mockClear();

    document.body.append(milo);
    await settle(milo);
    expect(reads(fake)).toEqual([
      { type: "siipet/cats" },
      { type: "siipet/day", date: "2026-09-27", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
  });

  it("does not read again on a reattach after a change it already read", async () => {
    const fake = fakeHass();
    const luna = await mount(fake);
    const milo = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    await change(luna, "save");
    await settle(luna);
    await settle(milo);
    fake.callWS.mockClear();

    milo.remove();
    document.body.append(milo);
    await settle(milo);
    expect(reads(fake)).toEqual([]);
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

  function inEditor(editor: HTMLElement, selector: string): Part | null {
    return editor.shadowRoot!.querySelector(selector) as Part | null;
  }

  /** Tap the first timeline row and return the editor that opens. */
  async function openFirstVisit(card: TestCard): Promise<HTMLElement> {
    findAll(card, ".visit")[0].dispatchEvent(
      new CustomEvent("action", { detail: { action: "tap" } }),
    );
    await settle(card);
    return find(card, "siipet-visit-editor")!;
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
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
      visit: { date: "2026-09-25", visit: shared },
      day: { ...DAY, visits: [LINGERING] },
    });
    const card = await mount(fake, { cat: "dev-unknown" });
    expect(reads(fake).slice(2)).toEqual([
      { type: "siipet/visit", event_id: "ev-1" },
      { type: "siipet/day", date: "2026-09-25", cat: "dev-milo" },
      { type: "siipet/calendar", month: "2026-09", cat: "dev-milo" },
    ]);
    expect(editing(card)).toBe(shared);

    await closeEditor(card, "ev-1");
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
    expect(text(find(card, ".date"))).toBe("Fri, Sep 25");
  });

  it("keeps the shown cat when it owns the visit", async () => {
    const shared: Visit = {
      ...POOP,
      cats: [
        { device_id: "dev-luna", name: "Luna" },
        { device_id: "dev-milo", name: "Milo" },
      ],
    };
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: shared } });
    const card = await mount(fake, { cat: "dev-milo" });
    expect(reads(fake).slice(3)).toEqual([{ type: "siipet/visit", event_id: "ev-1" }]);
    expect(editing(card)).toBe(shared);

    await closeEditor(card, "ev-1");
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Milo");
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
    expect(text(find(card, ".date"))).toBe("Fri, Sep 25");
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

  it("reads a link that the address keeps again only on the next navigation", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    const card = await mount(fake, { cat: "dev-milo", hide_cat_picker: true });
    expect(visitReads(fake)).toBe(1);

    window.dispatchEvent(new Event("popstate"));
    fake.listeners.get("ready")!();
    await settle(card);
    expect(visitReads(fake)).toBe(1);

    // A new tap of the same notification navigates to the same address.
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

  it("opens a visit in one card when two owners read the link at once", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const fake = fakeHass();
    const held: ((value: unknown) => void)[] = [];
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message.type === "siipet/visit") {
        return new Promise((resolve) => held.push(resolve));
      }
      return original(message);
    });
    const first = await mount(fake);
    const second = await mount(fake, { cat: "dev-luna", hide_cat_picker: true });
    expect(held).toHaveLength(2);
    const replace = vi.spyOn(history, "replaceState");

    held[1](fake.results.visit);
    await settle(second);
    held[0](fake.results.visit);
    await settle(first);

    expect(editing(second)?.event_id).toBe("ev-1");
    expect(editing(first)).toBeUndefined();
    expect(replace).toHaveBeenCalledOnce();
    expect(location.search).toBe("");
  });

  it("leaves the link for the next view when the card detaches during the read", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    let releaseVisit!: (value: unknown) => void;
    fake.callWS.mockImplementationOnce(() => new Promise((resolve) => (releaseVisit = resolve)));

    navigate("/dash?siipet_visit=ev-1");
    await settle(card);
    card.remove();
    releaseVisit(fake.results.visit);
    await settle(card);
    expect(location.search).toBe("?siipet_visit=ev-1");
    expect(editing(card)).toBeUndefined();

    document.body.append(card);
    await settle(card);
    expect(visitReads(fake)).toBe(2);
    expect(editing(card)?.event_id).toBe("ev-1");
    expect(location.search).toBe("");
  });

  it("gives a linked visit its own editor, distinct from the last one", async () => {
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: LINGERING } });
    const card = await mount(fake);
    const first = await openFirstVisit(card);

    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-2");
    const second = find(card, "siipet-visit-editor")!;

    expect(second).not.toBe(first);
  });

  /** Open the first visit, pick Pee, and tap Save. The save stays pending until released. */
  async function holdSave(
    fake: FakeHass,
    card: TestCard,
  ): Promise<{ editor: HTMLElement; release: () => void; reject: (reason: unknown) => void }> {
    let release!: () => void;
    let reject!: (reason: unknown) => void;
    fake.callService.mockImplementationOnce(
      () =>
        new Promise((resolve, fail) => {
          release = () => resolve(undefined);
          reject = fail;
        }),
    );
    const editor = await openFirstVisit(card);
    inEditor(editor, "ha-control-select.type")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "pee" } }),
    );
    await settle(card);
    inEditor(editor, ".save")!.click();
    await settle(card);
    return { editor, release: () => release(), reject: (reason) => reject(reason) };
  }

  it("opens a link that came during a save after the save ends", async () => {
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: LINGERING } });
    const card = await mount(fake);
    const save = await holdSave(fake, card);
    fake.callWS.mockClear();

    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-1");
    expect(find(card, "siipet-visit-editor")).toBe(save.editor);
    expect(location.search).toBe("?siipet_visit=ev-2");
    expect(visitReads(fake)).toBe(0);

    save.release();
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-2");
    expect(location.search).toBe("");
    expect(reads(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
      "siipet/visit",
    ]);
  });

  it("keeps a failed save and its error in view while a link waits", async () => {
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: LINGERING } });
    const card = await mount(fake);
    const save = await holdSave(fake, card);

    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    save.reject({ code: "home_assistant_error", message: "SiiPet could not save the visit" });
    await settle(card);

    expect(find(card, "siipet-visit-editor")).toBe(save.editor);
    expect(text(inEditor(save.editor, ".error"))).toBe("SiiPet could not save the visit");
    expect(inEditor(save.editor, "ha-control-select.type")?.value).toBe("pee");
    expect(location.search).toBe("?siipet_visit=ev-2");
    expect(visitReads(fake)).toBe(0);

    // A refresh does not take the link while the failed save is on screen.
    fake.listeners.get("ready")!();
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBe(save.editor);

    // Back from the failed save opens the link.
    inEditor(save.editor, ".header")!.dispatchEvent(
      new CustomEvent("action", { detail: { action: "tap" } }),
    );
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-2");
    expect(location.search).toBe("");
  });

  it("opens a link held by a failed save on the next navigation", async () => {
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: LINGERING } });
    const card = await mount(fake);
    const save = await holdSave(fake, card);
    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    save.reject({ code: "home_assistant_error", message: "SiiPet could not save the visit" });
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBe(save.editor);

    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-2");
  });

  it("holds a link whose read answers after a save started", async () => {
    const fake = fakeHass({ visit: { date: "2026-09-27", visit: LINGERING } });
    const card = await mount(fake);
    let releaseVisit!: (value: unknown) => void;
    const original = fake.callWS.getMockImplementation() as (
      message: Record<string, unknown>,
    ) => Promise<unknown>;
    fake.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message.type === "siipet/visit" && releaseVisit === undefined) {
        return new Promise((resolve) => (releaseVisit = resolve));
      }
      return original(message);
    });
    const editor = await openFirstVisit(card);
    navigate("/dash?siipet_visit=ev-2");
    await settle(card);
    expect(visitReads(fake)).toBe(1);

    let releaseSave!: () => void;
    fake.callService.mockImplementationOnce(
      () => new Promise((resolve) => (releaseSave = () => resolve(undefined))),
    );
    inEditor(editor, "ha-control-select.type")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "pee" } }),
    );
    await settle(card);
    inEditor(editor, ".save")!.click();
    await settle(card);

    releaseVisit(fake.results.visit);
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBe(editor);
    expect(location.search).toBe("?siipet_visit=ev-2");

    releaseSave();
    await settle(card);
    expect(editing(card)?.event_id).toBe("ev-2");
    expect(location.search).toBe("");
  });

  it("keeps a new editor of the same visit open when the save of the old one ends", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    const save = await holdSave(fake, card);

    // A config change during the save shows the day again, and the visit opens anew.
    card.setConfig({ type: "custom:siipet-visits-card", cat: "dev-luna" });
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBeNull();
    const reopened = await openFirstVisit(card);
    expect(reopened).not.toBe(save.editor);
    const memo = inEditor(reopened, ".memo-input") as unknown as HTMLInputElement;
    memo.value = "draft";
    memo.dispatchEvent(new Event("input"));
    await settle(card);
    fake.callWS.mockClear();

    save.release();
    await settle(card);
    expect(find(card, "siipet-visit-editor")).toBe(reopened);
    expect((inEditor(reopened, ".memo-input") as unknown as HTMLInputElement).value).toBe("draft");
    expect(reads(fake).map((message) => message.type)).toEqual([
      "siipet/cats",
      "siipet/day",
      "siipet/calendar",
    ]);
  });

  it("reads a link to a visit outside the window only once", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-99");
    const error = {
      code: "service_validation_error",
      translation_key: "visit_not_in_window",
      message: "SiiPet has no visit ev-99 in the last 7 days",
    };
    const fake = fakeHass({ fail: { "siipet/visit": error } });
    const card = await mount(fake);
    expect(visitReads(fake)).toBe(1);

    fake.listeners.get("ready")!();
    await settle(card);
    expect(visitReads(fake)).toBe(1);
  });

  describe("after a visit_not_in_window failure", () => {
    const error = {
      code: "service_validation_error",
      translation_key: "visit_not_in_window",
      message: "SiiPet has no visit ev-1 in the last 7 days",
    };

    it("reads the link again on the next navigation", async () => {
      history.replaceState(null, "", "/dash?siipet_visit=ev-1");
      const fake = fakeHass({ fail: { "siipet/visit": error } });
      const card = await mount(fake);
      expect(visitReads(fake)).toBe(1);

      fake.results.fail = {};
      window.dispatchEvent(new Event("location-changed"));
      await settle(card);
      expect(visitReads(fake)).toBe(2);
      expect(editing(card)?.event_id).toBe("ev-1");
    });

    it("does not read the link again on popstate", async () => {
      history.replaceState(null, "", "/dash?siipet_visit=ev-1");
      const fake = fakeHass({ fail: { "siipet/visit": error } });
      const card = await mount(fake);
      expect(visitReads(fake)).toBe(1);

      fake.results.fail = {};
      window.dispatchEvent(new Event("popstate"));
      await settle(card);
      expect(visitReads(fake)).toBe(1);
      expect(editing(card)).toBeUndefined();
    });
  });

  it("reads a link outside the window again when a card detached during the read", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    let rejectVisit!: (reason: unknown) => void;
    fake.callWS.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (rejectVisit = reject)),
    );
    const error = {
      code: "service_validation_error",
      translation_key: "visit_not_in_window",
      message: "SiiPet has no visit ev-99 in the last 7 days",
    };
    fake.results.fail = { "siipet/visit": error };

    navigate("/dash?siipet_visit=ev-99");
    await settle(card);
    card.remove();
    rejectVisit(error);
    await settle(card);

    document.body.append(card);
    await settle(card);
    expect(visitReads(fake)).toBe(2);
    expect(text(find(card, ".error"))).toBe("SiiPet has no visit ev-99 in the last 7 days");
  });

  it("reads a link again after a failure that can pass", async () => {
    history.replaceState(null, "", "/dash?siipet_visit=ev-1");
    const error = {
      code: "service_validation_error",
      translation_key: "not_loaded",
      message: "SiiPet is not loaded. Check the SiiPet integration",
    };
    const fake = fakeHass({ fail: { "siipet/visit": error } });
    const card = await mount(fake);
    expect(text(find(card, ".error"))).toBe("SiiPet is not loaded. Check the SiiPet integration");

    fake.results.fail = {};
    fake.listeners.get("ready")!();
    await settle(card);
    expect(visitReads(fake)).toBe(2);
    expect(editing(card)?.event_id).toBe("ev-1");
  });
});

describe("locale", () => {
  it("shows the dates in the language of the profile", async () => {
    const fake = fakeHass();
    fake.hass = withLocale(fake.hass, {
      language: "pl",
      time_format: "language",
      first_weekday: "language",
    });
    const card = await mount(fake);
    expect(text(find(card, ".date"))).toBe("niedz., 27 wrz");

    find(card, ".date")!.click();
    await settle(card);
    expect(text(find(card, ".month-name"))).toBe("wrzesień 2026");
    expect(findAll(card, ".weekday").map((day) => text(day))).toEqual([
      "pon.",
      "wt.",
      "śr.",
      "czw.",
      "pt.",
      "sob.",
      "niedz.",
    ]);
  });

  it("shows 12-hour times when the profile asks for them", async () => {
    const fake = fakeHass();
    fake.hass = withLocale(fake.hass, { time_format: "12" });
    const card = await mount(fake);
    const poop = findAll(card, ".visit")[0];
    expect(text(poop.querySelector('[slot="primary"]'))).toBe("8:11 PM");
  });

  it("starts the calendar on the first weekday of the language", async () => {
    const fake = fakeHass();
    fake.hass = withLocale(fake.hass, { first_weekday: "language" });
    const card = await mount(fake);
    find(card, ".date")!.click();
    await settle(card);
    expect(text(findAll(card, ".weekday")[0])).toBe("Sun");
    // 1 September 2026 is a Tuesday.
    expect(findAll(card, ".blank")).toHaveLength(2);
  });

  it("renders again when only the profile locale changes", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    expect(text(find(card, ".date"))).toBe("Sun, Sep 27");
    const calls = sent(fake).length;

    card.hass = withLocale(fake.hass, { language: "pl" });
    await settle(card);
    expect(text(find(card, ".date"))).toBe("niedz., 27 wrz");
    expect(sent(fake)).toHaveLength(calls);
  });

  it("shows the day view in Polish", async () => {
    const fake = fakeHass();
    fake.hass = withLocale(fake.hass, { language: "pl" });
    const card = await mount(fake);
    expect(text(find(card, '.header [slot="secondary"]'))).toBe(
      "niedz., 27 wrz · 1 wizyta · 1 kupa · 1 nieprawidłowa",
    );
    const poop = findAll(card, ".visit")[0];
    expect(text(poop.querySelector('[slot="secondary"]'))).toContain("Kupa · 57 s");
    expect(find(card, ".date")?.label).toBe("Wybierz dzień");
  });

  it("shows an empty day and the queue in Polish", async () => {
    const summary = { visits: 0, pee: 0, poop: 0, abnormal: 0 };
    const empty = fakeHass({ day: { summary, visits: [] } });
    empty.hass = withLocale(empty.hass, { language: "pl" });
    expect(text(find(await mount(empty), ".empty"))).toBe("Brak wizyt tego dnia.");
    document.body.replaceChildren();

    const queue = fakeHass({
      cats: catsResult({ unknown: { device_id: "dev-unknown", waiting: 1 } }),
    });
    queue.hass = withLocale(queue.hass, { language: "pl" });
    const card = await mount(queue, { cat: "dev-unknown" });
    expect(text(find(card, '.header [slot="primary"]'))).toBe("Nieznany");
    expect(text(find(card, '.header [slot="secondary"]'))).toBe("1 wizyta do przypisania");
  });

  it("shows a SiiPet error in the language of the profile", async () => {
    const fake = fakeHass({
      fail: {
        "siipet/day": {
          code: "service_validation_error",
          message: "Choose a date from 2026-08-28 to 2026-09-27",
          translation_domain: "siipet",
          translation_key: "date_out_of_range",
          translation_placeholders: { first: "2026-08-28", last: "2026-09-27" },
        },
      },
    });
    fake.hass = withLocale(fake.hass, { language: "pl" });
    const card = await mount(fake);
    expect(fake.loadBackendTranslation).toHaveBeenCalledWith("exceptions", "siipet");
    expect(text(find(card, ".error"))).toBe("Wybierz datę od 2026-08-28 do 2026-09-27.");
  });

  it("loads the exception texts once per language", async () => {
    const fake = fakeHass();
    const card = await mount(fake);
    card.hass = withState(fake.hass, "sensor.outside", "13");
    await settle(card);
    expect(fake.loadBackendTranslation).toHaveBeenCalledTimes(1);

    card.hass = withLocale(fake.hass, { language: "pl" });
    await settle(card);
    expect(fake.loadBackendTranslation).toHaveBeenCalledTimes(2);
  });

  it("shows the English message without exception texts", async () => {
    const fake = fakeHass({
      fail: {
        "siipet/day": {
          code: "home_assistant_error",
          message: "SiiPet could not read",
        },
      },
    });
    fake.hass = { ...fake.hass, loadBackendTranslation: undefined };
    const card = await mount(fake);
    expect(text(find(card, ".error"))).toBe("SiiPet could not read");
  });

  describe("with a Polish page", () => {
    afterEach(() => {
      document.documentElement.lang = "";
    });

    it("names the card, the form, and the config errors in Polish", () => {
      document.documentElement.lang = "pl";
      const entries = (window as { customCards?: { type: string; name: string }[] }).customCards;
      expect(entries?.find((entry) => entry.type === "siipet-visits-card")?.name).toBe(
        "Wizyty SiiPet",
      );
      const form = cardClass().getConfigForm();
      expect(form.computeLabel({ name: "cat" })).toBe("Kot");
      expect(form.computeHelper({ name: "hide_cat_picker" })).toBe(
        "Karta zostaje przy jednym kocie.",
      );
      const card = document.createElement("siipet-visits-card") as HTMLElement & {
        setConfig(config: unknown): void;
      };
      expect(() => card.setConfig({ type: "custom:siipet-visits-card", cat: 3 })).toThrow(
        "Opcja cat musi być identyfikatorem urządzenia.",
      );
    });
  });
});
