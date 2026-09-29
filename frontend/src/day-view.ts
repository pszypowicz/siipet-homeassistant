// Templates of the day view: header row, date bar, month calendar, cat strip, and timeline.

import { html, nothing, type TemplateResult } from "lit";

import { monthCells } from "./calendar";
import {
  dayLabel,
  durationText,
  firstWeekday,
  monthLabel,
  timeLabel,
  TYPE_STYLE,
  weekdayNames,
} from "./format";
import type { Localization } from "./localize";
import { optionRow } from "./option-row";
import type { CalendarResult, CatsResult, DaySummary, Visit } from "./types";

/** "Sun, Sep 27 · 3 visits · 1 poop · 2 pee · 1 abnormal", without the counts that are 0. */
export function daySummaryText(date: string, summary: DaySummary, l10n: Localization): string {
  const text = l10n.text;
  const parts = [dayLabel(date, l10n.locale), text.visits(summary.visits)];
  if (summary.poop > 0) parts.push(text.poop(summary.poop));
  if (summary.pee > 0) parts.push(text.pee(summary.pee));
  if (summary.abnormal > 0) parts.push(text.abnormal(summary.abnormal));
  return parts.join(" · ");
}

export function queueSummaryText(waiting: number, l10n: Localization): string {
  return l10n.text.waiting(waiting);
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
  l10n: Localization;
  onShift: (delta: number) => void;
  onToggle: () => void;
}

export function renderDateBar(options: DateBarOptions): TemplateResult {
  return html`
    <ha-control-button-group class="date-bar">
      <ha-control-button
        class="arrow prev-day"
        .label=${options.l10n.text.previousDay}
        .disabled=${!options.canGoBack}
        @click=${() => options.onShift(-1)}
      >
        <ha-icon icon="mdi:chevron-left"></ha-icon>
      </ha-control-button>
      <ha-control-button
        class="date"
        .label=${options.l10n.text.pickDay}
        @click=${options.onToggle}
      >
        <span>${dayLabel(options.date, options.l10n.locale)}</span>
        ${options.marked ? html`<span class="dot"></span>` : nothing}
      </ha-control-button>
      <ha-control-button
        class="arrow next-day"
        .label=${options.l10n.text.nextDay}
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
  l10n: Localization;
  onShiftMonth: (delta: number) => void;
  onOpenDay: (date: string) => void;
}

export function renderCalendar(options: CalendarOptions): TemplateResult {
  const cells = monthCells(
    options.month,
    options.calendar ?? null,
    options.selected,
    firstWeekday(options.l10n.locale),
  );
  return html`
    <div class="calendar">
      <ha-control-button-group class="month-bar">
        <ha-control-button
          class="arrow prev-month"
          .label=${options.l10n.text.previousMonth}
          .disabled=${!options.canGoBack}
          @click=${() => options.onShiftMonth(-1)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </ha-control-button>
        <div class="month-name">${monthLabel(options.month, options.l10n.locale)}</div>
        <ha-control-button
          class="arrow next-month"
          .label=${options.l10n.text.nextMonth}
          .disabled=${!options.canGoForward}
          @click=${() => options.onShiftMonth(1)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </ha-control-button>
      </ha-control-button-group>
      <div class="grid">
        ${weekdayNames(options.l10n.locale).map((day) => html`<span class="weekday">${day}</span>`)}
        ${cells.map((cell) =>
          cell.date === null
            ? html`<span class="blank"></span>`
            : html`
                <ha-control-button
                  class="cell ${cell.selected ? "selected" : ""}"
                  data-date=${cell.date}
                  .label=${dayLabel(cell.date, options.l10n.locale)}
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

const AVATAR_STYLE = "width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex: none";

/** The cat strip, or nothing when it is hidden or there is only one option. */
export function renderCatStrip(
  cats: CatsResult,
  selected: string,
  hidden: boolean,
  onSelect: (deviceId: string) => void,
  l10n: Localization,
): TemplateResult | typeof nothing {
  if (hidden) {
    return nothing;
  }
  // The option icons render inside ha-control-select, where the card styles do not reach.
  const options = cats.cats.map((cat) => ({
    value: cat.device_id,
    ariaLabel: cat.name,
    icon: optionRow(
      cat.avatar
        ? html`<img src=${cat.avatar} alt="" style=${AVATAR_STYLE} />`
        : html`<ha-icon icon="mdi:cat"></ha-icon>`,
      cat.name,
    ),
  }));
  if (cats.unknown.waiting > 0) {
    const unknownName = l10n.text.unknownOption(cats.unknown.waiting);
    options.push({
      value: cats.unknown.device_id,
      ariaLabel: unknownName,
      icon: optionRow(html`<ha-icon icon="mdi:help"></ha-icon>`, unknownName),
    });
  }
  if (options.length < 2) {
    return nothing;
  }
  // The event stops here, as in the tile features, so a dashboard editor around
  // the card does not take it for a change of its own form.
  return html`
    <ha-control-select
      class="cats"
      .options=${options}
      .value=${selected}
      .label=${l10n.text.cat}
      @value-changed=${(ev: CustomEvent<{ value: string }>) => {
        ev.stopPropagation();
        onSelect(ev.detail.value);
      }}
    ></ha-control-select>
  `;
}

function renderVisit(
  visit: Visit,
  withDay: boolean,
  onOpen: (visit: Visit) => void,
  l10n: Localization,
): TemplateResult {
  const style = TYPE_STYLE[visit.type];
  const time = timeLabel(visit.start, l10n.locale);
  const primary = withDay ? `${dayLabel(visit.start.slice(0, 10), l10n.locale)} ${time}` : time;
  const secondary = `${l10n.text.types[visit.type]} · ${durationText(visit.duration)}`;
  // The camera comes last, so the row cuts it off before the memo icon.
  const camera = visit.camera ? ` · ${visit.camera}` : "";
  const memo = visit.note
    ? html`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`
    : nothing;
  const reason = visit.abnormal_reasons[0] ?? l10n.text.abnormalChip;
  const chip = visit.abnormal
    ? html`<span slot="features-inline" class="chip">${reason}</span>`
    : nothing;
  const cover = visit.cover
    ? html`<img class="cover" src=${visit.cover} alt="" loading="lazy" />`
    : nothing;
  const stool = visit.stool
    ? html`<div class="stool-row">
        <ha-icon icon="mdi:camera-outline"></ha-icon>
        <span class="stool-label">${l10n.text.stoolPhoto}</span>
        <img class="stool" src=${visit.stool} alt=${l10n.text.stoolPhoto} loading="lazy" />
      </div>`
    : nothing;
  const cameraOnly = visit.has_video
    ? nothing
    : html`<span class="camera-only">${l10n.text.onCameraOnly}</span>`;
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
        <span slot="secondary">${secondary} ${memo}${camera}</span>
      </ha-tile-info>
      ${chip}
      <div slot="features" class="poster-slot">
        <div class="poster">${cover} ${cameraOnly}</div>
        ${stool}
      </div>
    </ha-tile-container>
  `;
}

/** The visits in the order of the server, newest first. Queue rows name their day. */
export function renderTimeline(
  visits: Visit[] | undefined,
  withDay: boolean,
  onOpen: (visit: Visit) => void,
  l10n: Localization,
): TemplateResult | typeof nothing {
  if (visits === undefined) {
    return nothing;
  }
  if (visits.length === 0) {
    const text = withDay ? l10n.text.noVisitsWaiting : l10n.text.noVisitsOnDay;
    return html`<div class="message empty">${text}</div>`;
  }
  return html`<div class="timeline">
    ${visits.map((visit) => renderVisit(visit, withDay, onOpen, l10n))}
  </div>`;
}
