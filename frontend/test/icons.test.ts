import { beforeEach, describe, expect, it, vi } from "vitest";

interface CustomIcon {
  path: string;
}

interface CustomIconListItem {
  name: string;
  keywords?: string[];
}

interface CustomIconHelpers {
  getIcon(name: string): Promise<CustomIcon>;
  getIconList?(): Promise<CustomIconListItem[]>;
}

interface CustomIconsWindow {
  customIcons?: Record<string, CustomIconHelpers>;
}

function win(): CustomIconsWindow {
  return window as unknown as CustomIconsWindow;
}

describe("icons", () => {
  beforeEach(() => {
    delete win().customIcons;
    vi.resetModules();
  });

  it("registers the siipet icon set with a logo path, and an empty path otherwise", async () => {
    await import("../src/icons");
    const siipet = win().customIcons!.siipet;
    const logo = await siipet.getIcon("logo");
    expect(logo.path.length).toBeGreaterThan(0);
    const other = await siipet.getIcon("something-else");
    expect(other.path).toBe("");
  });

  it("lists the logo icon", async () => {
    await import("../src/icons");
    const siipet = win().customIcons!.siipet;
    const list = await siipet.getIconList!();
    expect(list).toEqual([{ name: "logo", keywords: ["siipet", "litter", "cat"] }]);
  });

  it("keeps an existing customIcons entry after the import, and does not replace the object", async () => {
    const existing: CustomIconHelpers = { getIcon: async () => ({ path: "M0 0" }) };
    const registry = { other: existing };
    win().customIcons = registry;

    await import("../src/icons");

    expect(win().customIcons).toBe(registry);
    expect(win().customIcons!.other).toBe(existing);
    expect(win().customIcons!.siipet).toBeDefined();
  });
});
