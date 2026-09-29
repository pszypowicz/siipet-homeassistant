// Each test file has its own element registry, so this file can leave a part undefined.

import { beforeAll, expect, it } from "vitest";

import { fakeHass, find, loadCard, mount, stubTileParts, text } from "./helpers";

beforeAll(async () => {
  stubTileParts(["ha-control-select"]);
  await loadCard();
});

it("names a missing tile part and reads nothing", async () => {
  const fake = fakeHass();
  const card = await mount(fake);
  expect(text(find(card, ".missing"))).toBe(
    "The card cannot start. The Home Assistant frontend has no ha-control-select.",
  );
  expect(fake.callWS).not.toHaveBeenCalled();
});
