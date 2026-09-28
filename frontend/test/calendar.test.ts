import { describe, expect, it } from "vitest";

import { monthCells } from "../src/calendar";
import type { CalendarResult } from "../src/types";

const CALENDAR: CalendarResult = {
  days: {
    "2026-09-17": { visits: 4, abnormal: 1, marked: true },
    "2026-09-21": { visits: 3, abnormal: 0, marked: false },
    "2026-09-24": { visits: 5, abnormal: 0, marked: true },
  },
  first: "2026-09-20",
  last: "2026-09-27",
};

describe("monthCells", () => {
  it("starts on Monday with empty cells before the first day", () => {
    // 1 September 2026 is a Tuesday.
    const cells = monthCells("2026-09", CALENDAR, "2026-09-27");
    expect(cells[0]).toEqual({ date: null });
    expect(cells[1]).toMatchObject({ date: "2026-09-01", day: 1 });
    expect(cells.filter((cell) => cell.date !== null)).toHaveLength(30);
  });

  it("marks days, opens only the days with recordings, and selects the day", () => {
    const cells = monthCells("2026-09", CALENDAR, "2026-09-24");
    const byDate = Object.fromEntries(
      cells.filter((cell) => cell.date !== null).map((cell) => [cell.date, cell]),
    );
    expect(byDate["2026-09-17"]).toMatchObject({ marked: true, openable: false });
    expect(byDate["2026-09-19"]).toMatchObject({ marked: false, openable: false });
    expect(byDate["2026-09-21"]).toMatchObject({ marked: false, openable: true });
    expect(byDate["2026-09-24"]).toMatchObject({
      marked: true,
      openable: true,
      selected: true,
    });
    expect(byDate["2026-09-27"]).toMatchObject({ openable: true, selected: false });
    expect(byDate["2026-09-28"]).toMatchObject({ openable: false });
  });

  it("works without calendar data", () => {
    const cells = monthCells("2026-02", null, "2026-02-10");
    expect(cells.filter((cell) => cell.date !== null)).toHaveLength(28);
    expect(cells.some((cell) => cell.date !== null && cell.marked)).toBe(false);
    expect(cells.some((cell) => cell.date !== null && cell.openable)).toBe(false);
  });
});
