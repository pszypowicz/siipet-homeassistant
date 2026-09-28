// The edit view of one visit: recording, stool photo, cats, type, memo, Save, and Delete.

import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import { deleteVisit, errorMessage, isPartialEdit, resolveVideo, updateVisit } from "./api";
import { changedFields, type EditForm, initialForm } from "./changes";
import { dayLabel, durationText, timeOf, TYPE_STYLE } from "./format";
import { cardStyles } from "./styles";
import type { Cat, HomeAssistant, Visit } from "./types";

const MEMO_LENGTH = 200;
const TYPES = ["pee", "poop", "lingering"] as const;
const DELETE_TITLE = "Delete this visit?";
const DELETE_TEXT = "SiiPet deletes the visit and its recording. You cannot undo this.";

interface ConfirmationDialogParams {
  title?: string;
  text?: string;
  confirmText?: string;
  dismissText?: string;
  destructive?: boolean;
}

interface CardHelpers {
  showConfirmationDialog?: (
    element: HTMLElement,
    params: ConfirmationDialogParams,
  ) => Promise<boolean>;
}

interface HelperWindow {
  loadCardHelpers?: () => Promise<CardHelpers>;
  confirm(message?: string): boolean;
}

// ha-control-select stacks an option's icon and label in a column that does not
// fit the tile control height, so the icon template puts both in one row instead
// and the option's label stays unset; the name goes to ariaLabel for aria-label
// and title.
const OPTION_ROW_STYLE =
  "display: inline-flex; align-items: center; gap: 8px; max-width: 100%; white-space: nowrap";
const OPTION_NAME_STYLE = "overflow: hidden; text-overflow: ellipsis; min-width: 0";

function optionRow(icon: TemplateResult, name: string): TemplateResult {
  return html`<span style=${OPTION_ROW_STYLE}
    >${icon}<span style=${OPTION_NAME_STYLE}>${name}</span></span
  >`;
}

export interface CloseDetail {
  changed: boolean;
  /** The event id of the visit this editor showed, so a card that opened another
   * visit while this close was pending (a stale save or delete) can tell the two
   * apart. */
  eventId: string;
}

/** The detail of `siipet-busy`, which the editor fires when a save or a delete starts and ends. */
export interface BusyDetail {
  busy: boolean;
}

export class SiiPetVisitEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    visit: { attribute: false },
    cats: { attribute: false },
    _baseline: { state: true },
    _form: { state: true },
    _video: { state: true },
    _videoNote: { state: true },
    _error: { state: true },
    _busy: { state: true },
    _partialEdit: { state: true },
  };

  static styles = [
    cardStyles,
    css`
      :host {
        display: block;
      }
      .editor {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0 12px 12px;
      }
      video {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: var(--ha-border-radius-lg, 12px);
        background-color: black;
      }
      .video-note,
      .hint,
      .reasons {
        color: var(--secondary-text-color);
      }
      .stool-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .stool-photo {
        width: 40%;
        height: auto;
        object-fit: contain;
        border-radius: var(--ha-border-radius-lg, 12px);
      }
      .stool-label {
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      ha-control-button.cat img {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        border-radius: 50%;
        object-fit: cover;
      }
      ha-control-button.cat.on,
      ha-control-button.save {
        --control-button-background-color: var(--tile-color);
        --control-button-background-opacity: 1;
        --control-button-icon-color: white;
      }
      ha-control-button.delete {
        --control-button-icon-color: var(--error-color);
      }
      .memo-field {
        position: relative;
      }
      /* No tile feature has a text field, so the memo input copies the look of a feature. */
      .memo-input {
        box-sizing: border-box;
        width: 100%;
        height: 42px;
        padding: 0 64px 0 12px;
        border: none;
        border-radius: var(--ha-border-radius-lg, 12px);
        font: inherit;
        color: var(--primary-text-color);
        background-color: color-mix(in srgb, var(--disabled-color) 20%, transparent);
      }
      .counter {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .error {
        margin: 0;
      }
    `,
  ];

  declare hass?: HomeAssistant;
  declare visit?: Visit;
  declare cats: Cat[];
  /** The visit this editor opened with. Save compares the form with this, not
   * with a refreshed `visit`, so a field changed elsewhere between opens does
   * not look like a change the form itself made. */
  declare _baseline?: Visit;
  declare _form?: EditForm;
  declare _video?: string;
  declare _videoNote?: string;
  declare _error?: string;
  declare _busy: boolean;
  declare _partialEdit: boolean;

  private _resolveSeq = 0;

  constructor() {
    super();
    this.cats = [];
    this._busy = false;
    this._partialEdit = false;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("visit") || !this.visit) {
      return;
    }
    const previous = changed.get("visit") as Visit | undefined;
    if (previous?.event_id === this.visit.event_id) {
      // A refreshed visit object for the same event: the Save baseline, the
      // form, the error, and the busy state stay as they are. The cover and
      // the stool photo render straight from `visit`, so they renew on their
      // own. The recording renews too, unless it is playing, so a refresh
      // does not interrupt it.
      if (this.visit.has_video && !this._isVideoPlaying()) {
        void this._resolveVideo(this.visit.event_id);
      }
      return;
    }
    this._baseline = this.visit;
    this._form = initialForm(this.visit);
    this._video = undefined;
    this._videoNote = this.visit.has_video ? undefined : "Recording is on the camera only.";
    this._error = undefined;
    this._partialEdit = false;
    if (this.visit.has_video) {
      void this._resolveVideo(this.visit.event_id);
    }
  }

  private _isVideoPlaying(): boolean {
    const video = this.renderRoot.querySelector("video");
    return video !== null && !video.paused;
  }

  // A video the user started, even one they then paused, must not be reset by a
  // renewal answer that lands after they started it.
  private _isVideoActive(): boolean {
    const video = this.renderRoot.querySelector("video");
    return video !== null && (!video.paused || video.currentTime > 0);
  }

  private async _resolveVideo(eventId: string): Promise<void> {
    const seq = ++this._resolveSeq;
    // A resolve that finds a URL already in place is a background renewal: its
    // failure must keep the working player, not replace it with an error note.
    // Only the first resolve of a visit, which has no player to protect, does.
    const isRenewal = this._video !== undefined;
    try {
      const url = await resolveVideo(this.hass!, eventId);
      if (this.visit?.event_id !== eventId || seq !== this._resolveSeq) {
        return;
      }
      if (this._isVideoActive()) {
        return;
      }
      this._video = url;
      this._videoNote = undefined;
    } catch (err) {
      if (this.visit?.event_id === eventId && seq === this._resolveSeq && !isRenewal) {
        this._videoNote = errorMessage(err);
      }
    }
  }

  private _close(changed: boolean): void {
    const detail: CloseDetail = { changed, eventId: this.visit!.event_id };
    this.dispatchEvent(new CustomEvent<CloseDetail>("siipet-close", { detail }));
  }

  // The card holds a link while a save or a delete runs, so its result stays in view.
  private _setBusy(busy: boolean): void {
    this._busy = busy;
    this.dispatchEvent(new CustomEvent<BusyDetail>("siipet-busy", { detail: { busy } }));
  }

  private _back(): void {
    if (this._busy) {
      return;
    }
    this._close(false);
  }

  private _toggleCat(deviceId: string): void {
    if (this._busy) {
      return;
    }
    const form = this._form!;
    const on = form.cats.includes(deviceId);
    if (on && form.cats.length === 1) {
      return;
    }
    const cats = on ? form.cats.filter((cat) => cat !== deviceId) : [...form.cats, deviceId];
    this._form = { ...form, cats };
  }

  private async _save(data: Record<string, unknown>): Promise<void> {
    this._setBusy(true);
    this._error = undefined;
    try {
      await updateVisit(this.hass!, data);
      this._partialEdit = false;
      this._close(true);
    } catch (err) {
      this._error = errorMessage(err);
      // A later failure for another reason (for example a dropped connection)
      // must not clear a flag an earlier partial edit set: the server's type
      // is still out of step with the visit until a save succeeds.
      if (isPartialEdit(err)) {
        this._partialEdit = true;
      }
    } finally {
      this._setBusy(false);
    }
  }

  private async _confirmDelete(): Promise<boolean> {
    const win = window as unknown as HelperWindow;
    const helpers = await win.loadCardHelpers?.();
    if (helpers?.showConfirmationDialog) {
      return helpers.showConfirmationDialog(this, {
        title: DELETE_TITLE,
        text: DELETE_TEXT,
        confirmText: "Delete",
        dismissText: "Cancel",
        destructive: true,
      });
    }
    return win.confirm(`${DELETE_TITLE}\n${DELETE_TEXT}`);
  }

  private async _delete(): Promise<void> {
    if (!(await this._confirmDelete())) {
      return;
    }
    this._setBusy(true);
    this._error = undefined;
    try {
      await deleteVisit(this.hass!, this.visit!.event_id);
      this._close(true);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._setBusy(false);
    }
  }

  protected render(): TemplateResult | typeof nothing {
    const baseline = this._baseline;
    const current = this.visit;
    const form = this._form;
    if (!baseline || !current || !form) {
      return nothing;
    }
    const check = changedFields(baseline, form, { sendType: this._partialEdit });
    const hint = check.reason === "type_required" ? "Pick a type as well." : undefined;
    return html`
      ${this._renderHeader(baseline)}
      <div class="editor">
        ${this._renderVideo(current.cover)} ${this._renderStool(baseline, current.stool)}
        ${this._renderCats(form)} ${this._renderType(form)} ${this._renderMemo(form)}
        ${hint ? html`<div class="hint">${hint}</div>` : nothing}
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${this._renderActions(check.data)}
      </div>
    `;
  }

  private _renderHeader(visit: Visit): TemplateResult {
    const style = TYPE_STYLE[visit.type];
    const names = visit.cats.map((cat) => cat.name).join(", ") || "Unknown";
    const secondary = [
      dayLabel(visit.start.slice(0, 10)),
      style.label,
      durationText(visit.duration),
      ...visit.abnormal_reasons.slice(0, 1),
    ].join(" · ");
    return html`
      <ha-tile-container class="header" .interactive=${true} @action=${() => this._back()}>
        <ha-tile-icon slot="icon" .icon=${"mdi:arrow-left"}></ha-tile-icon>
        <ha-tile-info slot="info">
          <span slot="primary">${timeOf(visit.start)} · ${names}</span>
          <span slot="secondary">${secondary}</span>
        </ha-tile-info>
      </ha-tile-container>
    `;
  }

  private _renderType(form: EditForm): TemplateResult {
    const options = TYPES.map((type) => ({
      value: type,
      ariaLabel: TYPE_STYLE[type].label,
      icon: optionRow(
        html`<ha-icon icon=${TYPE_STYLE[type].icon}></ha-icon>`,
        TYPE_STYLE[type].label,
      ),
    }));
    return html`
      <ha-control-select
        class="type"
        .options=${options}
        .value=${form.type ?? undefined}
        .label=${"Type"}
        .disabled=${this._busy}
        @value-changed=${(ev: CustomEvent<{ value: EditForm["type"] }>) => {
          // As in the tile features, the event does not leave the editor.
          ev.stopPropagation();
          if (this._busy) {
            return;
          }
          this._form = { ...form, type: ev.detail.value };
        }}
      ></ha-control-select>
    `;
  }

  private _renderMemo(form: EditForm): TemplateResult {
    return html`
      <div class="memo-field">
        <input
          class="memo-input"
          type="text"
          maxlength=${MEMO_LENGTH}
          placeholder="Memo"
          aria-label="Memo"
          .value=${form.note}
          .disabled=${this._busy}
          @input=${(ev: Event) => {
            if (this._busy) {
              return;
            }
            this._form = { ...form, note: (ev.target as HTMLInputElement).value };
          }}
        />
        <span class="counter">${form.note.length}/${MEMO_LENGTH}</span>
      </div>
    `;
  }

  private _renderActions(data: Record<string, unknown> | null): TemplateResult {
    const remove = this.hass?.user?.is_admin
      ? html`
          <ha-control-button
            class="delete"
            .label=${"Delete"}
            .disabled=${this._busy}
            @click=${() => this._delete()}
          >
            <span>Delete</span>
          </ha-control-button>
        `
      : nothing;
    return html`
      <ha-control-button-group class="actions">
        <ha-control-button
          class="save"
          .label=${"Save"}
          .disabled=${data === null || this._busy}
          @click=${() => data && this._save(data)}
        >
          <span>Save</span>
        </ha-control-button>
        ${remove}
      </ha-control-button-group>
    `;
  }

  private _renderVideo(cover: string | null): TemplateResult {
    if (this._videoNote !== undefined) {
      return html`<div class="video-note">${this._videoNote}</div>`;
    }
    // The recordings use H.265, which only some browsers play.
    return html`
      <video
        controls
        playsinline
        preload="none"
        poster=${cover ?? nothing}
        src=${this._video ?? nothing}
        @error=${() => {
          this._videoNote =
            "This browser cannot play the recording. Safari and the Home Assistant app can.";
        }}
      ></video>
    `;
  }

  private _renderStool(visit: Visit, stool: string | null): TemplateResult | typeof nothing {
    if (!stool && visit.abnormal_reasons.length === 0) {
      return nothing;
    }
    return html`
      <div class="stool-row">
        ${stool ? html`<img class="stool-photo" src=${stool} alt="Stool photo" />` : nothing}
        <div>
          ${stool ? html`<div class="stool-label">Stool photo</div>` : nothing}
          <span class="reasons">${visit.abnormal_reasons.join(", ")}</span>
        </div>
      </div>
    `;
  }

  private _renderCats(form: EditForm): TemplateResult {
    return html`
      <ha-control-button-group class="cat-toggles">
        ${this.cats.map(
          (cat) => html`
            <ha-control-button
              class="cat ${form.cats.includes(cat.device_id) ? "on" : ""}"
              .label=${cat.name}
              .disabled=${this._busy}
              @click=${() => this._toggleCat(cat.device_id)}
            >
              ${cat.avatar ? html`<img src=${cat.avatar} alt="" />` : nothing}
              <span>${cat.name}</span>
            </ha-control-button>
          `,
        )}
      </ha-control-button-group>
    `;
  }
}

if (!customElements.get("siipet-visit-editor")) {
  customElements.define("siipet-visit-editor", SiiPetVisitEditor);
}
