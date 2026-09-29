// Each test file has its own element registry, so this file can load the card before the app.

import { expect, it } from "vitest";

import { stubTileParts } from "./helpers";

it("defines its elements only after the app defines home-assistant", async () => {
  // The app page has the root element in its HTML before the app bundle defines it.
  document.body.append(document.createElement("home-assistant"));
  stubTileParts();
  await import("../src/siipet-visits-card");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const entries = (window as { customCards?: { type: string }[] }).customCards;
  expect(entries?.some((entry) => entry.type === "siipet-visits-card")).toBe(true);
  expect(customElements.get("siipet-visits-card")).toBeUndefined();
  expect(customElements.get("siipet-visit-editor")).toBeUndefined();

  customElements.define("home-assistant", class extends HTMLElement {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(customElements.get("siipet-visits-card")).toBeDefined();
  expect(customElements.get("siipet-visit-editor")).toBeDefined();
});
