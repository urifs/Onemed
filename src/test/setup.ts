import "@testing-library/jest-dom";

// jsdom não implementa estes DOM APIs de browser. Vários componentes de UI
// (carrosséis, popovers, gráficos) os usam no mount — sem os stubs, o render
// estoura "ResizeObserver is not defined", mascarando (ou fingindo) um bug de
// código. Stubar aqui deixa o render seguir e revelar erros de verdade.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = NoopObserver;
}
if (!(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver) {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoopObserver;
}
if (!(Element.prototype as { scrollIntoView?: unknown }).scrollIntoView) {
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = () => {};
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
