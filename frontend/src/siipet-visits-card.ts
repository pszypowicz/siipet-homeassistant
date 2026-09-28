// The SiiPet visits card: the visits of one cat on one day, or the Unknown queue.

import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import { errorMessage, fetchCalendar, fetchCats, fetchDay, fetchQueue } from "./api";
import {
  daySummaryText,
  queueSummaryText,
  renderCalendar,
  renderCatStrip,
  renderDateBar,
  renderHeader,
  renderTimeline,
} from "./day-view";
import "./edit-view";
import type { CloseDetail } from "./edit-view";
import { dayLabel, monthOf, shiftDay, shiftMonth, timeOf } from "./format";
import { cardStyles } from "./styles";
import { loadTileParts } from "./tile-parts";
import type {
  CalendarResult,
  CardConfig,
  CatsResult,
  DayResult,
  HassConnection,
  HomeAssistant,
  QueueResult,
  Visit,
} from "./types";

// The time since the last successful read after which a visible page reads again.
// Signed image paths last 1 hour, so this margin also covers a card that a
// dashboard view switch detaches and reattaches while it is stale.
const STALE_MS = 30 * 60 * 1000;
// A successful day or queue read schedules another one after this long, so a
// card left open on screen renews its image paths before they expire.
const RENEW_MS = 50 * 60 * 1000;
// The calendar command accepts the current month and the 12 months before it.
const CALENDAR_MONTHS = 12;

/** The states of the SiiPet event entities. A new visit changes one of them. */
function eventSignature(hass: HomeAssistant): string {
  return Object.values(hass.entities ?? {})
    .filter((entry) => entry.platform === "siipet" && entry.entity_id.startsWith("event."))
    .map((entry) => `${entry.entity_id}=${hass.states[entry.entity_id]?.state ?? ""}`)
    .join("|");
}

export class SiiPetVisitsCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _missing: { state: true },
    _cats: { state: true },
    _cat: { state: true },
    _date: { state: true },
    _month: { state: true },
    _calendars: { state: true },
    _first: { state: true },
    _calendarOpen: { state: true },
    _day: { state: true },
    _queue: { state: true },
    _error: { state: true },
    _editing: { state: true },
  };

  static styles = cardStyles;

  declare hass?: HomeAssistant;
  declare _config?: CardConfig;
  declare _missing?: string[];
  declare _cats?: CatsResult;
  declare _cat?: string;
  declare _date?: string;
  declare _month?: string;
  declare _calendars: Record<string, CalendarResult>;
  declare _first?: string;
  declare _calendarOpen: boolean;
  declare _day?: DayResult;
  declare _queue?: QueueResult;
  declare _error?: string;
  declare _editing?: Visit;

  private _started = false;
  private _signature?: string;
  private _lastRead?: number;
  private _connection?: HassConnection;
  private _renewTimer?: ReturnType<typeof setTimeout>;
  private _active?: Promise<void>;
  private _trailing = false;

  constructor() {
    super();
    this._calendars = {};
    this._calendarOpen = false;
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "cat", selector: { device: { filter: { integration: "siipet", model: "Cat" } } } },
      ],
      computeLabel: (schema: { name: string }) => (schema.name === "cat" ? "Cat" : undefined),
      computeHelper: (schema: { name: string }) =>
        schema.name === "cat"
          ? "Optional. Without a cat, the card starts with the first cat."
          : undefined,
    };
  }

  setConfig(config: CardConfig): void {
    if (config.cat !== undefined && (typeof config.cat !== "string" || config.cat === "")) {
      throw new Error("The cat option must be a device ID.");
    }
    const restart = this._started && config.cat !== this._config?.cat;
    this._config = config;
    if (restart) {
      this._started = false;
      this._cats = undefined;
      this._cat = undefined;
      this._calendars = {};
      this._first = undefined;
      this._calendarOpen = false;
      this._day = undefined;
      this._queue = undefined;
      this._error = undefined;
      this._editing = undefined;
    }
  }

  getCardSize(): number {
    return 8;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" as const };
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._onVisibilityChange);
    this._listen();
    // A dashboard view switch detaches and reattaches the card, which can leave it
    // stale for longer than a visibility change would ever let it go unnoticed.
    if (this._lastRead !== undefined) {
      const elapsed = Date.now() - this._lastRead;
      if (elapsed > STALE_MS) {
        void this._run(() => this._refresh());
      } else {
        // Not stale yet: pick up the renewal schedule where it left off, instead
        // of renewing early or not at all for the rest of the original wait.
        this._scheduleRenew(RENEW_MS - elapsed);
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this._connection?.removeEventListener("ready", this._onReady);
    this._connection = undefined;
    if (this._renewTimer !== undefined) {
      clearTimeout(this._renewTimer);
      this._renewTimer = undefined;
    }
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!this.hass || !this._config) {
      return;
    }
    if (!this._started) {
      this._started = true;
      void this._run(() => this._start());
    }
    if (changed.has("hass")) {
      this._listen();
      const signature = eventSignature(this.hass);
      if (this._signature !== undefined && signature !== this._signature && this._showsLatest()) {
        void this._run(() => this._refresh());
      }
      this._signature = signature;
    }
  }

  private _onVisibilityChange = (): void => {
    if (
      document.visibilityState === "visible" &&
      this._lastRead !== undefined &&
      Date.now() - this._lastRead > STALE_MS
    ) {
      void this._run(() => this._refresh());
    }
  };

  // A Home Assistant restart makes every signed path invalid, so a new connection reads again.
  private _onReady = (): void => {
    void this._run(() => this._refresh());
  };

  /** Run one start or refresh at a time, and queue at most one more behind it.
   * A trigger that arrives while a run is active marks the queued run instead of
   * starting a second one next to it. The queued run is always a refresh, so a
   * visit that arrived mid-run is read after the active run ends. A config change
   * clears the cat, and the first cats answer after it, in the active run or the
   * queued one, selects the configured cat. */
  private _run(action: () => Promise<void>): Promise<void> {
    if (this._active) {
      this._trailing = true;
      return this._active;
    }
    this._active = this._execute(action);
    return this._active;
  }

  private async _execute(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } finally {
      this._active = undefined;
      if (this._trailing) {
        this._trailing = false;
        void this._run(() => this._refresh());
      }
    }
  }

  private _scheduleRenew(delay = RENEW_MS): void {
    if (this._renewTimer !== undefined) {
      clearTimeout(this._renewTimer);
      this._renewTimer = undefined;
    }
    // A read that lands after the card is removed must not arm a timer that no
    // disconnectedCallback will ever clear.
    if (!this.isConnected) {
      return;
    }
    this._renewTimer = setTimeout(
      () => {
        if (this.isConnected && document.visibilityState === "visible") {
          void this._run(() => this._refresh());
        }
      },
      Math.max(delay, 0),
    );
  }

  private _listen(): void {
    const connection = this.hass?.connection;
    if (!this.isConnected || !connection || connection === this._connection) {
      return;
    }
    this._connection?.removeEventListener("ready", this._onReady);
    connection.addEventListener("ready", this._onReady);
    this._connection = connection;
  }

  // A renewal or a reconnect can replace `_day` or `_queue` while the editor is
  // open, so the open visit's image paths and recording renew with it instead
  // of staying on paths that are about to expire.
  private _refreshEditing(visits: Visit[]): void {
    if (!this._editing) {
      return;
    }
    const updated = visits.find((visit) => visit.event_id === this._editing!.event_id);
    if (updated) {
      this._editing = updated;
    }
  }

  private _isQueue(): boolean {
    return this._cat !== undefined && this._cat === this._cats?.unknown.device_id;
  }

  private _showsLatest(): boolean {
    return this._isQueue() || (this._date !== undefined && this._date === this._cats?.today);
  }

  private _firstCat(cats: CatsResult): string | undefined {
    return cats.cats[0]?.device_id;
  }

  // The Unknown cat owns every visit without a known cat, so it is the fallback
  // when the account has no named cat yet, not just when it is asked for by name.
  private _fallbackCat(cats: CatsResult): string | undefined {
    return this._firstCat(cats) ?? (cats.unknown.waiting > 0 ? cats.unknown.device_id : undefined);
  }

  private _startCat(cats: CatsResult): string | undefined {
    const wanted = this._config?.cat;
    if (wanted === cats.unknown.device_id && cats.unknown.waiting > 0) {
      return wanted;
    }
    return cats.cats.find((cat) => cat.device_id === wanted)?.device_id ?? this._fallbackCat(cats);
  }

  private async _start(): Promise<void> {
    const missing = await loadTileParts();
    if (missing.length > 0) {
      this._missing = missing;
      return;
    }
    await this._readCatsAndInit();
  }

  /** Read the cats and pick the initial cat and day, as a fresh start does. */
  private async _readCatsAndInit(): Promise<void> {
    const cats = await this._readCats();
    if (cats) {
      await this._init(cats);
    }
  }

  /** Select the configured cat, or the fallback, on the server's day and read it. */
  private async _init(cats: CatsResult): Promise<void> {
    this._date = cats.today;
    this._month = monthOf(cats.today);
    this._cat = this._startCat(cats);
    await this._loadSelection();
  }

  private async _readCats(): Promise<CatsResult | undefined> {
    try {
      this._cats = await fetchCats(this.hass!);
      return this._cats;
    } catch (err) {
      this._error = errorMessage(err);
      return undefined;
    }
  }

  /** Read the day or the queue, and the calendar month of the day. */
  private async _loadSelection(): Promise<void> {
    if (this._cat === undefined || this._date === undefined) {
      return;
    }
    if (this._isQueue()) {
      await this._loadQueue();
      return;
    }
    await Promise.all([this._loadDay(), this._loadCalendar(monthOf(this._date))]);
  }

  // Each read checks that the card still shows what it asked for, so a slow answer
  // for an earlier day or cat does not replace the newer one.
  private async _loadDay(): Promise<void> {
    const cat = this._cat!;
    const date = this._date!;
    const current = () => cat === this._cat && date === this._date;
    try {
      const day = await fetchDay(this.hass!, date, cat);
      if (current()) {
        this._day = day;
        this._lastRead = Date.now();
        this._scheduleRenew();
        this._refreshEditing(day.visits);
      }
    } catch (err) {
      if (current()) {
        this._error = errorMessage(err);
      }
    }
  }

  private async _loadQueue(): Promise<void> {
    const cat = this._cat;
    try {
      const queue = await fetchQueue(this.hass!);
      if (cat !== this._cat) {
        return;
      }
      this._lastRead = Date.now();
      this._scheduleRenew();
      // The queue and the waiting count on the cat strip name the same visits,
      // so a read that finds fewer or more of them updates the strip too.
      if (this._cats) {
        this._cats = {
          ...this._cats,
          unknown: { ...this._cats.unknown, waiting: queue.visits.length },
        };
      }
      if (queue.visits.length === 0) {
        const first = this._cats && this._firstCat(this._cats);
        if (first !== undefined) {
          this._selectCat(first);
          return;
        }
      }
      this._queue = queue;
      this._refreshEditing(queue.visits);
    } catch (err) {
      if (cat === this._cat) {
        this._error = errorMessage(err);
      }
    }
  }

  private async _loadCalendar(month: string): Promise<void> {
    const cat = this._cat!;
    try {
      const calendar = await fetchCalendar(this.hass!, month, cat);
      if (cat === this._cat) {
        this._calendars = { ...this._calendars, [month]: calendar };
        this._first = calendar.first;
      }
    } catch (err) {
      if (cat === this._cat) {
        this._error = errorMessage(err);
      }
    }
  }

  /** Read the cats and the shown data again. A card on today moves on to a new day. */
  private async _refresh(): Promise<void> {
    this._error = undefined;
    if (this._missing?.length) {
      return;
    }
    if (!this._cats) {
      // The first read never finished (for example Home Assistant was still starting),
      // so pick up where a fresh start would: read the cats, then the initial selection.
      await this._readCatsAndInit();
      return;
    }
    // Keep the date shown before the read, so a day the user picks while this read
    // is in flight is not undone by a stale comparison once the read comes back.
    const shownDate = this._date;
    const followToday = shownDate === this._cats.today;
    const cats = await this._readCats();
    if (!cats) {
      return;
    }
    if (followToday && this._date === shownDate && shownDate !== cats.today) {
      this._date = cats.today;
      this._month = monthOf(cats.today);
    }
    if (this._cat === undefined) {
      // A config change during the cats read cleared the cat, or the account had
      // no cat before. The config decides the cat here as it does on a start.
      await this._init(cats);
      return;
    }
    if (this._isQueue() && cats.unknown.waiting === 0) {
      const next = this._firstCat(cats);
      if (next !== undefined) {
        this._selectCat(next);
        return;
      }
    }
    await this._loadSelection();
  }

  private _selectCat(cat: string): void {
    if (cat === this._cat) {
      return;
    }
    this._cat = cat;
    this._calendars = {};
    this._first = undefined;
    this._calendarOpen = false;
    this._day = undefined;
    this._queue = undefined;
    this._error = undefined;
    void this._loadSelection();
  }

  private _goToDay(date: string): void {
    this._date = date;
    this._month = monthOf(date);
    this._calendarOpen = false;
    this._day = undefined;
    this._error = undefined;
    void this._loadDay();
    if (!(this._month in this._calendars)) {
      void this._loadCalendar(this._month);
    }
  }

  private _shiftMonth(delta: number): void {
    this._month = shiftMonth(this._month!, delta);
    this._error = undefined;
    void this._loadCalendar(this._month);
  }

  /** Return to the day view for the visit this close is about. After an edit, read
   * again either way: a save or a delete for a visit that is no longer the one
   * shown (a stale close from a detached editor) still changed the server's data.
   * Close and scroll only when the ids match, so that stale close does not drop
   * the visit the card has moved on to. */
  private async _closeEditor({ changed, eventId }: CloseDetail): Promise<void> {
    const matches = this._editing?.event_id === eventId;
    if (matches) {
      this._editing = undefined;
    }
    if (changed) {
      await this._run(() => this._refresh());
    }
    if (!matches) {
      return;
    }
    await this.updateComplete;
    const rows = this.shadowRoot?.querySelectorAll<HTMLElement>(".visit") ?? [];
    [...rows].find((row) => row.dataset.event === eventId)?.scrollIntoView({ block: "nearest" });
  }

  private _toggleCalendar(): void {
    this._month = monthOf(this._date!);
    this._calendarOpen = !this._calendarOpen;
  }

  protected render(): TemplateResult {
    if (this._missing?.length) {
      return html`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;
    }
    const cats = this._cats;
    const selected = this._cat;
    const mainShown = cats !== undefined && selected !== undefined;
    const noCats = html`<div class="message alone">The SiiPet account has no cats.</div>`;
    return html`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${cats && !cats.available ? this._renderNotice(cats) : nothing}
        ${cats && selected === undefined ? noCats : nothing}
        ${cats && selected !== undefined ? this._renderMain(cats, selected) : nothing}
        ${!mainShown && this._error ? html`<div class="error">${this._error}</div>` : nothing}
      </ha-card>
    `;
  }

  private _renderNotice(cats: CatsResult): TemplateResult {
    const day = dayLabel(cats.updated_at.slice(0, 10));
    return html`
      <div class="notice">
        SiiPet is not updating. Last update: ${day} ${timeOf(cats.updated_at)}.
      </div>
    `;
  }

  private _renderMain(cats: CatsResult, selected: string): TemplateResult {
    if (this._editing) {
      return html`
        <siipet-visit-editor
          .hass=${this.hass}
          .visit=${this._editing}
          .cats=${cats.cats}
          @siipet-close=${(ev: CustomEvent<CloseDetail>) => this._closeEditor(ev.detail)}
        ></siipet-visit-editor>
      `;
    }
    return html`
      ${this._renderView(cats, selected)}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${this._renderVisits()}
    `;
  }

  private _renderView(cats: CatsResult, selected: string): TemplateResult {
    const strip = renderCatStrip(cats, selected, (cat) => this._selectCat(cat));
    if (this._isQueue()) {
      return renderHeader({
        icon: "mdi:help",
        primary: "Unknown",
        secondary: queueSummaryText(this._queue?.visits.length ?? cats.unknown.waiting),
        features: html`${strip}`,
      });
    }
    const cat = cats.cats.find((entry) => entry.device_id === selected);
    const date = this._date!;
    const month = this._month ?? monthOf(date);
    const first = this._first;
    const lastMonth = monthOf(cats.today);
    const dateBar = renderDateBar({
      date,
      canGoBack: first === undefined || shiftDay(date, -1) >= first,
      canGoForward: date < cats.today,
      marked: this._calendars[monthOf(date)]?.days[date]?.marked ?? false,
      onShift: (delta) => this._goToDay(shiftDay(date, delta)),
      onToggle: () => this._toggleCalendar(),
    });
    const calendar = this._calendarOpen
      ? renderCalendar({
          month,
          calendar: this._calendars[month],
          selected: date,
          canGoBack: month > shiftMonth(lastMonth, -CALENDAR_MONTHS),
          canGoForward: month < lastMonth,
          onShiftMonth: (delta) => this._shiftMonth(delta),
          onOpenDay: (day) => this._goToDay(day),
        })
      : nothing;
    return renderHeader({
      imageUrl: cat?.avatar ?? undefined,
      icon: cat?.avatar ? undefined : "mdi:cat",
      primary: cat?.name ?? "",
      secondary: this._day ? daySummaryText(date, this._day.summary) : dayLabel(date),
      features: html`${dateBar} ${calendar} ${strip}`,
    });
  }

  private _renderVisits() {
    const open = (visit: Visit) => {
      this._editing = visit;
    };
    return this._isQueue()
      ? renderTimeline(this._queue?.visits, true, open)
      : renderTimeline(this._day?.visits, false, open);
  }
}

if (!customElements.get("siipet-visits-card")) {
  customElements.define("siipet-visits-card", SiiPetVisitsCard);
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
}

const cardWindow = window as { customCards?: CustomCardEntry[] };
cardWindow.customCards = cardWindow.customCards ?? [];
if (!cardWindow.customCards.some((entry) => entry.type === "siipet-visits-card")) {
  cardWindow.customCards.push({
    type: "siipet-visits-card",
    name: "SiiPet visits",
    description: "The litter box visits of each cat, day by day.",
    preview: true,
  });
}
