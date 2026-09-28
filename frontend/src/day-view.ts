// Templates of the day view: header row, date bar, month calendar, cat strip, and timeline.

import { html, nothing, type TemplateResult } from "lit";

import { monthCells } from "./calendar";
import { dayLabel, durationText, monthLabel, timeOf, TYPE_STYLE } from "./format";
import type { CalendarResult, CatsResult, DaySummary, Visit } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function count(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

/** "Sun 27 Sep · 3 visits · 1 poop · 2 pee · 1 abnormal", without the counts that are 0. */
export function daySummaryText(date: string, summary: DaySummary): string {
  const parts = [dayLabel(date), count(summary.visits, "visit", "visits")];
  if (summary.poop > 0) parts.push(`${summary.poop} poop`);
  if (summary.pee > 0) parts.push(`${summary.pee} pee`);
  if (summary.abnormal > 0) parts.push(`${summary.abnormal} abnormal`);
  return parts.join(" · ");
}

export function queueSummaryText(waiting: number): string {
  return `${count(waiting, "visit", "visits")} waiting`;
}

export interface HeaderOptions {
  imageUrl?: string;
  icon?: string;
  primary: string;
  secondary: string;
  features: TemplateResult;
}

export function renderHeader(options: HeaderOptions): TemplateResult {
  return html`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${options.imageUrl} .icon=${options.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${options.primary}</span>
        <span slot="secondary">${options.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${options.features}</div>
    </ha-tile-container>
  `;
}

export interface DateBarOptions {
  date: string;
  canGoBack: boolean;
  canGoForward: boolean;
  marked: boolean;
  onShift: (delta: number) => void;
  onToggle: () => void;
}

export function renderDateBar(options: DateBarOptions): TemplateResult {
  return html`
    <ha-control-button-group class="date-bar">
      <ha-control-button
        class="arrow prev-day"
        .label=${"Previous day"}
        .disabled=${!options.canGoBack}
        @click=${() => options.onShift(-1)}
      >
        <ha-icon icon="mdi:chevron-left"></ha-icon>
      </ha-control-button>
      <ha-control-button class="date" .label=${"Pick a day"} @click=${options.onToggle}>
        <span>${dayLabel(options.date)}</span>
        ${options.marked ? html`<span class="dot"></span>` : nothing}
      </ha-control-button>
      <ha-control-button
        class="arrow next-day"
        .label=${"Next day"}
        .disabled=${!options.canGoForward}
        @click=${() => options.onShift(1)}
      >
        <ha-icon icon="mdi:chevron-right"></ha-icon>
      </ha-control-button>
    </ha-control-button-group>
  `;
}

export interface CalendarOptions {
  month: string;
  calendar: CalendarResult | undefined;
  selected: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onShiftMonth: (delta: number) => void;
  onOpenDay: (date: string) => void;
}

export function renderCalendar(options: CalendarOptions): TemplateResult {
  const cells = monthCells(options.month, options.calendar ?? null, options.selected);
  return html`
    <div class="calendar">
      <ha-control-button-group class="month-bar">
        <ha-control-button
          class="arrow prev-month"
          .label=${"Previous month"}
          .disabled=${!options.canGoBack}
          @click=${() => options.onShiftMonth(-1)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </ha-control-button>
        <div class="month-name">${monthLabel(options.month)}</div>
        <ha-control-button
          class="arrow next-month"
          .label=${"Next month"}
          .disabled=${!options.canGoForward}
          @click=${() => options.onShiftMonth(1)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </ha-control-button>
      </ha-control-button-group>
      <div class="grid">
        ${WEEKDAYS.map((day) => html`<span class="weekday">${day}</span>`)}
        ${cells.map((cell) =>
          cell.date === null
            ? html`<span class="blank"></span>`
            : html`
                <ha-control-button
                  class="cell ${cell.selected ? "selected" : ""}"
                  data-date=${cell.date}
                  .label=${dayLabel(cell.date)}
                  .disabled=${!cell.openable}
                  @click=${() => options.onOpenDay(cell.date)}
                >
                  <span>${cell.day}</span>
                  ${cell.marked ? html`<span class="dot"></span>` : nothing}
                </ha-control-button>
              `,
        )}
      </div>
    </div>
  `;
}

const AVATAR_STYLE = "width: 20px; height: 20px; border-radius: 50%; object-fit: cover";

/** The cat strip, or nothing when there is only one option. */
export function renderCatStrip(
  cats: CatsResult,
  selected: string,
  onSelect: (deviceId: string) => void,
): TemplateResult | typeof nothing {
  // The option icons render inside ha-control-select, where the card styles do not reach.
  const options = cats.cats.map((cat) => ({
    value: cat.device_id,
    label: cat.name,
    icon: cat.avatar
      ? html`<img src=${cat.avatar} alt="" style=${AVATAR_STYLE} />`
      : html`<ha-icon icon="mdi:cat"></ha-icon>`,
  }));
  if (cats.unknown.waiting > 0) {
    options.push({
      value: cats.unknown.device_id,
      label: `Unknown (${cats.unknown.waiting})`,
      icon: html`<ha-icon icon="mdi:help"></ha-icon>`,
    });
  }
  if (options.length < 2) {
    return nothing;
  }
  return html`
    <ha-control-select
      class="cats"
      .options=${options}
      .value=${selected}
      .label=${"Cat"}
      @value-changed=${(ev: CustomEvent<{ value: string }>) => onSelect(ev.detail.value)}
    ></ha-control-select>
  `;
}

function renderVisit(
  visit: Visit,
  withDay: boolean,
  onOpen: (visit: Visit) => void,
): TemplateResult {
  const style = TYPE_STYLE[visit.type];
  const time = timeOf(visit.start);
  const primary = withDay ? `${dayLabel(visit.start.slice(0, 10))} ${time}` : time;
  const memo = visit.note
    ? html`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`
    : nothing;
  const reason = visit.abnormal_reasons[0] ?? "Abnormal";
  const chip = visit.abnormal
    ? html`<span slot="features-inline" class="chip">${reason}</span>`
    : nothing;
  const cover = visit.cover
    ? html`<img class="cover" src=${visit.cover} alt="" loading="lazy" />`
    : nothing;
  const stool = visit.stool
    ? html`<img class="stool" src=${visit.stool} alt="Stool photo" loading="lazy" />`
    : nothing;
  const cameraOnly = visit.has_video
    ? nothing
    : html`<span class="camera-only">On camera only</span>`;
  return html`
    <ha-tile-container
      class="visit ${visit.type}"
      data-event=${visit.event_id}
      .interactive=${true}
      @action=${() => onOpen(visit)}
    >
      <ha-tile-icon
        slot="icon"
        .icon=${style.icon}
        style="--tile-icon-color: ${style.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${primary}</span>
        <span slot="secondary">${style.label} · ${durationText(visit.duration)} ${memo}</span>
      </ha-tile-info>
      ${chip}
      <div slot="features" class="poster">${cover} ${stool} ${cameraOnly}</div>
    </ha-tile-container>
  `;
}

/** The visits in the order of the server, newest first. Queue rows name their day. */
export function renderTimeline(
  visits: Visit[] | undefined,
  withDay: boolean,
  onOpen: (visit: Visit) => void,
): TemplateResult | typeof nothing {
  if (visits === undefined) {
    return nothing;
  }
  if (visits.length === 0) {
    return html`<div class="message empty">No visits on this day.</div>`;
  }
  return html`<div class="timeline">
    ${visits.map((visit) => renderVisit(visit, withDay, onOpen))}
  </div>`;
}
