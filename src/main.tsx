import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary.tsx";
import "./index.css";

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
