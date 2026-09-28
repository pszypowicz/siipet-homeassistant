import { describe, expect, it } from "vitest";

import { changedFields, initialForm } from "../src/changes";
import type { Visit } from "../src/types";

const VISIT: Visit = {
  event_id: "ev-1",
  start: "2026-09-27T06:56:00+02:00",
  duration: 55,
  type: "poop",
  cats: [{ device_id: "dev-luna", name: "Luna" }],
  camera: "Bathroom",
  note: "",
  abnormal: false,
  abnormal_reasons: [],
  has_video: true,
  has_stool_image: true,
  cover: "/cover",
  stool: "/stool",
};

describe("initialForm", () => {
  it("starts from the visit", () => {
    expect(initialForm(VISIT)).toEqual({
      cats: ["dev-luna"],
      type: "poop",
      note: "",
    });
  });

  it("has no type for a visit of unknown type, and no cats for a visit without a cat", () => {
    expect(initialForm({ ...VISIT, type: "unknown", cats: [] })).toEqual({
      cats: [],
      type: null,
      note: "",
    });
  });
});

describe("changedFields", () => {
  it("reports no change for an untouched form", () => {
    expect(changedFields(VISIT, initialForm(VISIT))).toEqual({
      data: null,
      reason: "no_change",
    });
  });

  it("sends only the changed fields", () => {
    expect(changedFields(VISIT, { cats: ["dev-nala"], type: "poop", note: "" })).toEqual({
      data: { event_id: "ev-1", cats: ["dev-nala"] },
      reason: null,
    });
    expect(changedFields(VISIT, { cats: ["dev-luna"], type: "pee", note: "" })).toEqual({
      data: { event_id: "ev-1", type: "pee" },
      reason: null,
    });
  });

  it("trims the memo and treats the same cats in another order as unchanged", () => {
    const visit = { ...VISIT, cats: [...VISIT.cats, { device_id: "dev-milo", name: "Milo" }] };
    expect(
      changedFields(visit, { cats: ["dev-milo", "dev-luna"], type: "poop", note: "  x  " }),
    ).toEqual({ data: { event_id: "ev-1", note: "x" }, reason: null });
    expect(
      changedFields({ ...VISIT, note: "x" }, { cats: ["dev-luna"], type: "poop", note: " x " }),
    ).toEqual({ data: null, reason: "no_change" });
  });

  it("needs at least one cat", () => {
    expect(changedFields(VISIT, { cats: [], type: "poop", note: "" })).toEqual({
      data: null,
      reason: "no_cat",
    });
  });

  it("needs a type when the cats of an unknown-type visit change", () => {
    const visit: Visit = { ...VISIT, type: "unknown", cats: [] };
    expect(changedFields(visit, { cats: ["dev-milo"], type: null, note: "" })).toEqual({
      data: null,
      reason: "type_required",
    });
    expect(changedFields(visit, { cats: ["dev-milo"], type: "pee", note: "" })).toEqual({
      data: { event_id: "ev-1", cats: ["dev-milo"], type: "pee" },
      reason: null,
    });
    expect(changedFields(visit, { cats: [], type: null, note: "memo" })).toEqual({
      data: { event_id: "ev-1", note: "memo" },
      reason: null,
    });
  });

  it("sends the type again after a partial edit, even without a change", () => {
    expect(changedFields(VISIT, initialForm(VISIT), { sendType: true })).toEqual({
      data: { event_id: "ev-1", type: "poop" },
      reason: null,
    });
  });
});
