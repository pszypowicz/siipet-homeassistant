// Home Assistant loads the card as an extra module, in parallel with its app bundle.
// The app bundle replaces `window.customElements` with a scoped registry polyfill,
// and the new registry does not see an element defined before that. The polyfill
// also defines a stand-in for each app element in the native registry, so the
// native wait for `home-assistant` ends only after the polyfill is in place.
// A page with no `home-assistant` element, such as the Cast receiver, never
// defines it, so the card defines its elements there at once.

interface RegistryScope {
  customElements: CustomElementRegistry;
  document: Pick<Document, "querySelector">;
}

/**
 * Define `name` in the registry of the Home Assistant app, after the app defines
 * `home-assistant`. A name that is already defined keeps its first definition.
 */
export async function defineElement(
  name: string,
  element: CustomElementConstructor,
  scope: RegistryScope = window,
): Promise<void> {
  if (scope.document.querySelector("home-assistant")) {
    await scope.customElements.whenDefined("home-assistant");
  }
  const registry = scope.customElements;
  if (!registry.get(name)) {
    registry.define(name, element);
  }
}
