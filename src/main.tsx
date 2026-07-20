import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary.tsx";
import { showDiagnosticBanner } from "./lib/diagnosticBanner";
import "./index.css";

// Deliberately has zero dependency on React, so it still shows up even if
// React itself fails to mount or crashes before any error boundary exists
// to catch it. A stuck loading spinner with no visible error is
// undiagnosable from a screenshot; this turns whatever actually failed
// into readable text at the bottom of the screen.
window.addEventListener('error', (e) => {
  showDiagnosticBanner(`Erro: ${e.message} (${e.filename}:${e.lineno})`);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  showDiagnosticBanner(`Promise rejeitada: ${msg}`);
});

// The member-area PWA service worker registered a fetch handler that
// intercepted /membros navigation and cached scripts — right after it
// shipped, users got stuck on a loading spinner after login until they
// force-reloaded, because the SW's cache/network logic didn't reliably
// hand the fresh page back. Force-unregister it (and any other stray
// service worker) and wipe every Cache Storage entry for every visitor,
// so anyone already affected self-heals on their very next load without
// needing to know to hard-refresh.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  }).catch(() => {});
}
if ('caches' in window) {
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
