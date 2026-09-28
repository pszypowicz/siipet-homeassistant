import { describe, expect, it } from "vitest";

import {
  dayLabel,
  durationText,
  monthLabel,
  monthOf,
  shiftDay,
  shiftMonth,
  timeOf,
  TYPE_STYLE,
} from "../src/format";

describe("format", () => {
  it("labels a day in short English", () => {
    expect(dayLabel("2026-09-27")).toBe("Sun 27 Sep");
    expect(dayLabel("2026-01-01")).toBe("Thu 1 Jan");
  });

  it("labels a month", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
  });

  it("takes the time from the server string without a time zone change", () => {
    expect(timeOf("2026-09-27T20:11:03+02:00")).toBe("20:11");
    expect(timeOf("2026-09-26T23:59:59-07:00")).toBe("23:59");
  });

  it("writes durations in seconds and minutes", () => {
    expect(durationText(57)).toBe("57 s");
    expect(durationText(60)).toBe("1 min");
    expect(durationText(344)).toBe("5 min 44 s");
  });

  it("moves days and months across year ends", () => {
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(monthOf("2026-09-27")).toBe("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("gives each visit type a label, an icon, and a theme color", () => {
    expect(TYPE_STYLE.poop).toEqual({
      label: "Poop",
      icon: "mdi:emoticon-poop",
      color: "var(--brown-color)",
    });
    expect(TYPE_STYLE.pee.color).toBe("var(--amber-color)");
    expect(TYPE_STYLE.lingering.color).toBe("var(--grey-color)");
    expect(TYPE_STYLE.unknown.color).toBe("var(--disabled-color)");
  });
});
