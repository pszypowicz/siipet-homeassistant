import { describe, expect, it } from "vitest";

import { defineElement } from "../src/define";

/** The parts of an element registry that `defineElement` uses. */
class FakeRegistry {
  private readonly elements = new Map<string, CustomElementConstructor>();
  private readonly waiting = new Map<string, (() => void)[]>();

  get(name: string): CustomElementConstructor | undefined {
    return this.elements.get(name);
  }

  define(name: string, element: CustomElementConstructor): void {
    if (this.elements.has(name)) {
      throw new Error(`${name} is already defined`);
    }
    this.elements.set(name, element);
    for (const resolve of this.waiting.get(name) ?? []) {
      resolve();
    }
    this.waiting.delete(name);
  }

  whenDefined(name: string): Promise<void> {
    if (this.elements.has(name)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiting.set(name, [...(this.waiting.get(name) ?? []), resolve]);
    });
  }
}

function scopeWith(registry: FakeRegistry): { customElements: CustomElementRegistry } {
  return { customElements: registry as unknown as CustomElementRegistry };
}

class Card extends HTMLElement {}
class OtherCard extends HTMLElement {}
class Root extends HTMLElement {}

describe("defineElement", () => {
  it("defines the element in the registry that the app puts in place while it waits", async () => {
    const native = new FakeRegistry();
    const scope = scopeWith(native);
    const done = defineElement("siipet-test", Card, scope);

    // The registry polyfill of the app replaces the registry, then its define
    // of the root element also puts a stand-in into the native registry.
    const app = new FakeRegistry();
    scope.customElements = app as unknown as CustomElementRegistry;
    app.define("home-assistant", Root);
    native.define("home-assistant", class extends HTMLElement {});
    await done;

    expect(app.get("siipet-test")).toBe(Card);
    expect(native.get("siipet-test")).toBeUndefined();
  });

  it("keeps the first definition when a second copy of the card defines the same name", async () => {
    const app = new FakeRegistry();
    app.define("home-assistant", Root);
    const scope = scopeWith(app);

    await defineElement("siipet-test", Card, scope);
    await defineElement("siipet-test", OtherCard, scope);

    expect(app.get("siipet-test")).toBe(Card);
  });
});
