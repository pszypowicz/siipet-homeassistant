// Text and date helpers. Dates stay plain YYYY-MM-DD strings from the server,
// so no browser time zone ever shifts a day. Day and month names come from Intl
// in the locale of the user, with the options of the Home Assistant date
// formats, so the card reads like the rest of Home Assistant.

import type { FrontendLocale, VisitType } from "./types";

// The weekday values of the first_weekday setting, in getUTCDay() order.
const WEEKDAY_SETTINGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function utc(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Format a UTC-anchored value, so the browser time zone does not move it. The
 * month grid and its navigation stay on the Gregorian calendar, so a locale
 * whose default calendar differs (for example Persian) still names the same
 * days that `monthCells` and the shift functions compute. */
function format(locale: FrontendLocale, options: Intl.DateTimeFormatOptions, value: Date): string {
  return new Intl.DateTimeFormat(locale.language, {
    ...options,
    calendar: "gregory",
    timeZone: "UTC",
  }).format(value);
}

/** "Sun, Sep 27" in English, "niedz., 27 wrz" in Polish. */
export function dayLabel(day: string, locale: FrontendLocale): string {
  return format(locale, { weekday: "short", month: "short", day: "numeric" }, utc(day));
}

/** "September 2026" in English, "wrzesień 2026" in Polish. */
export function monthLabel(month: string, locale: FrontendLocale): string {
  return format(locale, { month: "long", year: "numeric" }, utc(`${month}-01`));
}

// The 12-hour check of the Home Assistant frontend.
function useAmPm(locale: FrontendLocale): boolean {
  if (locale.time_format === "12" || locale.time_format === "24") {
    return locale.time_format === "12";
  }
  const language = locale.time_format === "system" ? undefined : locale.language;
  return new Date("January 1, 2023 22:00:00").toLocaleString(language).includes("10");
}

/** The clock time of a server timestamp as the server wrote it: "20:11" or "8:11 PM". */
export function timeLabel(start: string, locale: FrontendLocale): string {
  const [hours, minutes] = start.slice(11, 16).split(":").map(Number);
  const amPm = useAmPm(locale);
  return format(
    locale,
    {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: amPm ? "h12" : "h23",
    },
    new Date(Date.UTC(1970, 0, 1, hours, minutes)),
  );
}

// Browsers expose the week data either as a method or as a getter.
interface WeekInfoLocale extends Intl.Locale {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
}

/** The first day of the calendar week, 0 for Sunday. Monday when the browser cannot tell. */
export function firstWeekday(locale: FrontendLocale): number {
  const setting = WEEKDAY_SETTINGS.indexOf(locale.first_weekday ?? "language");
  if (setting >= 0) {
    return setting;
  }
  try {
    const intlLocale = new Intl.Locale(locale.language) as WeekInfoLocale;
    const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
    if (info) {
      return info.firstDay % 7;
    }
  } catch {
    // An invalid language tag falls through to Monday.
  }
  return 1;
}

/** The short weekday names in calendar order. */
export function weekdayNames(locale: FrontendLocale): string[] {
  const first = firstWeekday(locale);
  // 1 January 2023 is a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    format(locale, { weekday: "short" }, new Date(Date.UTC(2023, 0, 1 + ((first + index) % 7)))),
  );
}

/** "57 s", "1 min", or "5 min 44 s". */
export function durationText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) {
    return `${rest} s`;
  }
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

export function shiftDay(day: string, delta: number): string {
  const value = utc(day);
  value.setUTCDate(value.getUTCDate() + delta);
  return isoDay(value);
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const value = utc(`${month}-01`);
  value.setUTCMonth(value.getUTCMonth() + delta);
  return isoDay(value).slice(0, 7);
}

export interface TypeStyle {
  icon: string;
  color: string;
}

export const TYPE_STYLE: Record<VisitType, TypeStyle> = {
  poop: { icon: "mdi:emoticon-poop", color: "var(--brown-color)" },
  pee: { icon: "mdi:water", color: "var(--amber-color)" },
  lingering: { icon: "mdi:paw", color: "var(--grey-color)" },
  unknown: { icon: "mdi:help", color: "var(--disabled-color)" },
};
