// Home Assistant loads the card as an extra module, in parallel with its app bundle.
// The app bundle replaces `window.customElements` with a scoped registry polyfill,
// and the new registry does not see an element defined before that. The polyfill
// also defines a stand-in for each app element in the native registry, so the
// native wait for `home-assistant` ends only after the polyfill is in place.

interface RegistryScope {
  customElements: CustomElementRegistry;
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
  await scope.customElements.whenDefined("home-assistant");
  const registry = scope.customElements;
  if (!registry.get(name)) {
    registry.define(name, element);
  }
}
