// The row template shared by the cat strip and the Type select: ha-control-select
// stacks an option's icon and label in a column that does not fit the tile
// control height, so this template puts both in one row instead, and the
// option's label stays unset; the name goes to ariaLabel for aria-label and title.

import { html, type TemplateResult } from "lit";

export const OPTION_ROW_STYLE =
  "display: inline-flex; align-items: center; gap: 6px; max-width: 100%; white-space: nowrap";
export const OPTION_NAME_STYLE = "overflow: hidden; text-overflow: ellipsis; min-width: 0";

export function optionRow(icon: TemplateResult, name: string): TemplateResult {
  return html`<span style=${OPTION_ROW_STYLE}
    >${icon}<span style=${OPTION_NAME_STYLE}>${name}</span></span
  >`;
}
