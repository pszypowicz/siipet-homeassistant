// The edit form and the fields that Save sends to siipet.update_visit.

import type { Visit, VisitType } from "./types";

export interface EditForm {
  /** Device ids of the selected cats. */
  cats: string[];
  /** Null while a visit of unknown type has no type picked. */
  type: Exclude<VisitType, "unknown"> | null;
  note: string;
}

export type SaveBlock = "no_change" | "no_cat" | "type_required";

export interface SaveCheck {
  data: Record<string, unknown> | null;
  reason: SaveBlock | null;
}

export interface ChangedFieldsOptions {
  /** Force `type` into the data even when the form's type matches the visit's.
   * A save that failed with a partial edit left the server's type out of step
   * with the visit the card still shows, so a retry needs to state it again. */
  sendType?: boolean;
}

export function initialForm(visit: Visit): EditForm {
  return {
    cats: visit.cats.flatMap((cat) => (cat.device_id ? [cat.device_id] : [])),
    type: visit.type === "unknown" ? null : visit.type,
    note: visit.note,
  };
}

function sameCats(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((cat) => b.includes(cat));
}

/** Return the update_visit data for the changed fields, or why Save stays off. */
export function changedFields(
  visit: Visit,
  form: EditForm,
  options: ChangedFieldsOptions = {},
): SaveCheck {
  const start = initialForm(visit);
  const data: Record<string, unknown> = { event_id: visit.event_id };
  const catsChanged = !sameCats(start.cats, form.cats);
  if (catsChanged) {
    if (form.cats.length === 0) {
      return { data: null, reason: "no_cat" };
    }
    data.cats = form.cats;
  }
  if (form.type !== null && (options.sendType || form.type !== start.type)) {
    data.type = form.type;
  }
  if (catsChanged && visit.type === "unknown" && data.type === undefined) {
    return { data: null, reason: "type_required" };
  }
  const note = form.note.trim();
  if (note !== visit.note) {
    data.note = note;
  }
  if (Object.keys(data).length === 1) {
    return { data: null, reason: "no_change" };
  }
  return { data, reason: null };
}
