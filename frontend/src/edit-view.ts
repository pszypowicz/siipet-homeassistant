// The edit view of one visit: recording, stool photo, cats, type, memo, Save, and Delete.

import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import { deleteVisit, errorMessage, resolveVideo, updateVisit } from "./api";
import { changedFields, type EditForm, initialForm } from "./changes";
import { dayLabel, durationText, timeOf, TYPE_STYLE } from "./format";
import { cardStyles } from "./styles";
import type { Cat, HomeAssistant, Visit } from "./types";

const MEMO_LENGTH = 200;
const DELETE_WINDOW_MS = 5000;
const TYPES = ["pee", "poop", "lingering"] as const;

export interface CloseDetail {
  changed: boolean;
}

export class SiiPetVisitEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    visit: { attribute: false },
    cats: { attribute: false },
    _form: { state: true },
    _video: { state: true },
    _videoNote: { state: true },
    _error: { state: true },
    _busy: { state: true },
    _armed: { state: true },
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
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: var(--ha-border-radius-lg, 12px);
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
      ha-control-button.delete.armed {
        --control-button-background-color: var(--error-color);
        --control-button-background-opacity: 1;
        --control-button-icon-color: white;
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
  declare _form?: EditForm;
  declare _video?: string;
  declare _videoNote?: string;
  declare _error?: string;
  declare _busy: boolean;
  declare _armed: boolean;

  private _disarm?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.cats = [];
    this._busy = false;
    this._armed = false;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._disarm);
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("visit") && this.visit) {
      this._form = initialForm(this.visit);
      this._video = undefined;
      this._videoNote = this.visit.has_video ? undefined : "Recording is on the camera only.";
      this._error = undefined;
      if (this.visit.has_video) {
        void this._resolveVideo(this.visit.event_id);
      }
    }
  }

  private async _resolveVideo(eventId: string): Promise<void> {
    try {
      const url = await resolveVideo(this.hass!, eventId);
      if (this.visit?.event_id === eventId) {
        this._video = url;
      }
    } catch (err) {
      if (this.visit?.event_id === eventId) {
        this._videoNote = errorMessage(err);
      }
    }
  }

  private _close(changed: boolean): void {
    this.dispatchEvent(new CustomEvent<CloseDetail>("siipet-close", { detail: { changed } }));
  }

  private _toggleCat(deviceId: string): void {
    const form = this._form!;
    const on = form.cats.includes(deviceId);
    if (on && form.cats.length === 1) {
      return;
    }
    const cats = on ? form.cats.filter((cat) => cat !== deviceId) : [...form.cats, deviceId];
    this._form = { ...form, cats };
  }

  private async _save(data: Record<string, unknown>): Promise<void> {
    this._busy = true;
    this._error = undefined;
    try {
      await updateVisit(this.hass!, data);
      this._close(true);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  private async _delete(): Promise<void> {
    if (!this._armed) {
      this._armed = true;
      this._disarm = setTimeout(() => {
        this._armed = false;
      }, DELETE_WINDOW_MS);
      return;
    }
    clearTimeout(this._disarm);
    this._armed = false;
    this._busy = true;
    this._error = undefined;
    try {
      await deleteVisit(this.hass!, this.visit!.event_id);
      this._close(true);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    const visit = this.visit;
    const form = this._form;
    if (!visit || !form) {
      return nothing;
    }
    const check = changedFields(visit, form);
    const hint = check.reason === "type_required" ? "Pick a type as well." : undefined;
    return html`
      ${this._renderHeader(visit)}
      <div class="editor">
        ${this._renderVideo(visit)} ${this._renderStool(visit)} ${this._renderCats(form)}
        ${this._renderType(form)} ${this._renderMemo(form)}
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
      <ha-tile-container class="header" .interactive=${true} @action=${() => this._close(false)}>
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
      label: TYPE_STYLE[type].label,
      icon: html`<ha-icon icon=${TYPE_STYLE[type].icon}></ha-icon>`,
    }));
    return html`
      <ha-control-select
        class="type"
        .options=${options}
        .value=${form.type ?? undefined}
        .label=${"Type"}
        @value-changed=${(ev: CustomEvent<{ value: EditForm["type"] }>) => {
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
          @input=${(ev: Event) => {
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
            class="delete ${this._armed ? "armed" : ""}"
            .label=${"Delete"}
            .disabled=${this._busy}
            @click=${() => this._delete()}
          >
            ${this._armed ? "Tap again to delete" : "Delete"}
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
          Save
        </ha-control-button>
        ${remove}
      </ha-control-button-group>
    `;
  }

  private _renderVideo(visit: Visit): TemplateResult {
    if (this._videoNote !== undefined) {
      return html`<div class="video-note">${this._videoNote}</div>`;
    }
    // The recordings use H.265, which only some browsers play.
    return html`
      <video
        controls
        playsinline
        preload="none"
        poster=${visit.cover ?? nothing}
        src=${this._video ?? nothing}
        @error=${() => {
          this._videoNote =
            "This browser cannot play the recording. Safari and the Home Assistant app can.";
        }}
      ></video>
    `;
  }

  private _renderStool(visit: Visit): TemplateResult | typeof nothing {
    if (!visit.stool && visit.abnormal_reasons.length === 0) {
      return nothing;
    }
    return html`
      <div class="stool-row">
        ${
          visit.stool
            ? html`<img class="stool-photo" src=${visit.stool} alt="Stool photo" />`
            : nothing
        }
        <span class="reasons">${visit.abnormal_reasons.join(", ")}</span>
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
