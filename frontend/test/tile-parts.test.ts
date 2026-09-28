import { describe, expect, it, vi } from "vitest";

import { loadTileParts, TILE_PARTS } from "../src/tile-parts";

function registry(defined: readonly string[]) {
  return { get: (name: string) => (defined.includes(name) ? HTMLElement : undefined) };
}

describe("loadTileParts", () => {
  it("loads the card helpers, then finds every part", async () => {
    const loadCardHelpers = vi.fn().mockResolvedValue({});
    const missing = await loadTileParts(registry(TILE_PARTS), { loadCardHelpers });
    expect(loadCardHelpers).toHaveBeenCalledOnce();
    expect(missing).toEqual([]);
  });

  it("names the parts that a frontend release removed", async () => {
    const defined = TILE_PARTS.filter((name) => name !== "ha-control-select");
    const missing = await loadTileParts(registry(defined), { loadCardHelpers: vi.fn() });
    expect(missing).toEqual(["ha-control-select"]);
  });

  it("still checks the parts when the helpers are not there", async () => {
    expect(await loadTileParts(registry([]), {})).toEqual([...TILE_PARTS]);
  });
});
