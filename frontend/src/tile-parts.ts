// The tile parts that the card reuses from the Home Assistant frontend.
// They are internal to the frontend, so the card checks that each one exists.

export const TILE_PARTS = [
  "ha-card",
  "ha-tile-container",
  "ha-tile-icon",
  "ha-tile-info",
  "ha-control-button",
  "ha-control-button-group",
  "ha-control-select",
  "ha-icon",
] as const;

interface ElementRegistry {
  get(name: string): unknown;
}

interface HelperWindow {
  loadCardHelpers?: () => Promise<unknown>;
}

/**
 * Load the card helpers, which define the tile parts, and return the names of
 * the parts that are still not defined.
 */
export async function loadTileParts(
  registry: ElementRegistry = customElements,
  win: HelperWindow = window as HelperWindow,
): Promise<string[]> {
  if (win.loadCardHelpers) {
    await win.loadCardHelpers();
  }
  return TILE_PARTS.filter((name) => registry.get(name) === undefined);
}
