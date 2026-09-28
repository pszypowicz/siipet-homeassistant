import { html, render } from "lit";
import { describe, expect, it } from "vitest";

import { optionRow } from "../src/option-row";

describe("optionRow", () => {
  it("puts a 6px gap between the icon and the name", () => {
    const container = document.createElement("div");
    render(optionRow(html`<ha-icon icon="mdi:cat"></ha-icon>`, "Luna"), container);
    const row = container.firstElementChild as HTMLElement;
    expect(row.style.gap).toBe("6px");
  });

  it("sets the row and the name to their content width", () => {
    // ha-control-select's own width: 100% rule on option spans would otherwise
    // stretch the name and center it in the option.
    const container = document.createElement("div");
    render(optionRow(html`<ha-icon icon="mdi:cat"></ha-icon>`, "Luna"), container);
    const row = container.firstElementChild as HTMLElement;
    const name = row.querySelector("span") as HTMLElement;
    expect(row.style.width).toBe("auto");
    expect(name.style.width).toBe("auto");
  });
});
