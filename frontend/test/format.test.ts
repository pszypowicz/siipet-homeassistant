import { describe, expect, it } from "vitest";

import {
  dayLabel,
  durationText,
  firstWeekday,
  monthLabel,
  monthOf,
  shiftDay,
  shiftMonth,
  timeLabel,
  TYPE_STYLE,
  weekdayNames,
} from "../src/format";

const EN = { language: "en", time_format: "24", first_weekday: "monday" };
const PL = {
  language: "pl",
  time_format: "language",
  first_weekday: "language",
};

describe("format", () => {
  it("labels a day like the Home Assistant date formats", () => {
    expect(dayLabel("2026-09-27", EN)).toBe("Sun, Sep 27");
    expect(dayLabel("2026-01-01", EN)).toBe("Thu, Jan 1");
    expect(dayLabel("2026-09-27", PL)).toBe("niedz., 27 wrz");
    expect(dayLabel("2026-09-27", { language: "en-GB" })).toBe("Sun 27 Sept");
  });

  it("labels a month", () => {
    expect(monthLabel("2026-09", EN)).toBe("September 2026");
    expect(monthLabel("2026-09", PL)).toBe("wrzesień 2026");
  });

  it("keeps the month on the Gregorian calendar, even where the locale defaults elsewhere", () => {
    expect(monthLabel("2026-09", { language: "fa" })).toBe("سپتامبر ۲۰۲۶");
  });

  it("takes the time from the server string without a time zone change", () => {
    expect(timeLabel("2026-09-27T20:11:03+02:00", EN)).toBe("20:11");
    expect(timeLabel("2026-09-26T07:46:59-07:00", EN)).toBe("07:46");
  });

  it("follows the 12-hour setting of the profile", () => {
    expect(timeLabel("2026-09-27T20:11:03+02:00", { ...EN, time_format: "12" })).toBe("8:11 PM");
    expect(
      timeLabel("2026-09-27T20:11:03+02:00", {
        ...EN,
        time_format: "language",
      }),
    ).toBe("8:11 PM");
    expect(timeLabel("2026-09-27T20:11:03+02:00", PL)).toBe("20:11");
  });

  it("does not pad a single-digit hour in the 24-hour format", () => {
    expect(timeLabel("2026-09-27T07:46:00+02:00", PL)).toBe("7:46");
  });

  it("finds the first weekday of the calendar", () => {
    expect(firstWeekday({ ...EN, first_weekday: "sunday" })).toBe(0);
    expect(firstWeekday(EN)).toBe(1);
    expect(firstWeekday({ language: "en", first_weekday: "language" })).toBe(0);
    expect(firstWeekday(PL)).toBe(1);
    expect(firstWeekday({ language: "not a tag", first_weekday: "language" })).toBe(1);
  });

  it("names the weekdays in calendar order", () => {
    expect(weekdayNames(PL)).toEqual(["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."]);
    expect(weekdayNames({ language: "en", first_weekday: "language" })).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
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

  it("gives each visit type an icon and a theme color", () => {
    expect(TYPE_STYLE.poop).toEqual({
      icon: "mdi:emoticon-poop",
      color: "var(--brown-color)",
    });
    expect(TYPE_STYLE.pee.color).toBe("var(--amber-color)");
    expect(TYPE_STYLE.lingering.color).toBe("var(--grey-color)");
    expect(TYPE_STYLE.unknown.color).toBe("var(--disabled-color)");
  });
});
