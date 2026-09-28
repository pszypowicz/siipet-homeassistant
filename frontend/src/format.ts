// Text and date helpers. Dates stay plain YYYY-MM-DD strings from the server,
// so no browser time zone ever shifts a day.

import type { VisitType } from "./types";

// Fixed English names: the card text is English only, and Intl month
// abbreviations differ between browsers ("Sep" or "Sept").
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function utc(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** "Sun 27 Sep" for "2026-09-27". */
export function dayLabel(day: string): string {
  const value = utc(day);
  const month = MONTHS[value.getUTCMonth()].slice(0, 3);
  return `${WEEKDAYS[value.getUTCDay()]} ${value.getUTCDate()} ${month}`;
}

/** "September 2026" for "2026-09". */
export function monthLabel(month: string): string {
  const value = utc(`${month}-01`);
  return `${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

/** The HH:MM part of a server timestamp, as the server wrote it. */
export function timeOf(start: string): string {
  return start.slice(11, 16);
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
  label: string;
  icon: string;
  color: string;
}

export const TYPE_STYLE: Record<VisitType, TypeStyle> = {
  poop: { label: "Poop", icon: "mdi:emoticon-poop", color: "var(--brown-color)" },
  pee: { label: "Pee", icon: "mdi:water", color: "var(--amber-color)" },
  lingering: { label: "Lingering", icon: "mdi:paw", color: "var(--grey-color)" },
  unknown: { label: "Unknown", icon: "mdi:help", color: "var(--disabled-color)" },
};
