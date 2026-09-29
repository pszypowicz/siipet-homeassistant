// The cells of the month calendar, from the first weekday of the user.

import type { CalendarResult } from "./types";

export type CalendarCell =
  | { date: null }
  | {
      date: string;
      day: number;
      marked: boolean;
      openable: boolean;
      selected: boolean;
    };

/** Return the cells of `month` (YYYY-MM), with empty cells before the 1st. `firstWeekday` is 0 for Sunday. */
export function monthCells(
  month: string,
  calendar: CalendarResult | null,
  selected: string,
  firstWeekday: number,
): CalendarCell[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  // getUTCDay() counts from Sunday, like firstWeekday.
  const blanks = (firstDay.getUTCDay() - firstWeekday + 7) % 7;
  const cells: CalendarCell[] = Array.from({ length: blanks }, () => ({ date: null }));
  for (let day = 1; day <= length; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({
      date,
      day,
      marked: calendar?.days[date]?.marked ?? false,
      openable: calendar !== null && calendar.first <= date && date <= calendar.last,
      selected: date === selected,
    });
  }
  return cells;
}
