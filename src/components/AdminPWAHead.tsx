import { useEffect } from 'react';

export const AdminPWAHead = () => {
  useEffect(() => {
    // Inject manifest link
    const manifest = document.createElement('link');
    manifest.id = 'admin-pwa-manifest';
    manifest.rel = 'manifest';
    manifest.href = '/admin-manifest.json';
    document.head.appendChild(manifest);

    // Apple PWA meta tags
    const metas: HTMLMetaElement[] = [];

    const addMeta = (name: string, content: string) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      meta.dataset.adminPwa = 'true';
      document.head.appendChild(meta);
      metas.push(meta);
    };

    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    addMeta('apple-mobile-web-app-title', 'OneMed Admin');
    addMeta('mobile-web-app-capable', 'yes');
    addMeta('theme-color', '#EF4444');

    // Apple touch icon (iOS requer PNG)
    const appleIcon = document.createElement('link');
    appleIcon.id = 'admin-pwa-apple-icon';
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/icons/admin-icon-192.png';
    document.head.appendChild(appleIcon);

    // Service worker do admin APOSENTADO (2026-08-07): não registramos mais
    // nenhum SW — o cache-first dele prendeu admins no bundle quebrado durante
    // o incidente do TDZ. O main.tsx já desregistra qualquer SW e limpa os
    // caches a cada load; o /admin-sw.js virou um kill-switch que se
    // autodestrói pra curar quem ainda o tiver registrado.

    // Cleanup on unmount (when leaving admin)
    return () => {
      document.getElementById('admin-pwa-manifest')?.remove();
      document.getElementById('admin-pwa-apple-icon')?.remove();
      document.querySelectorAll('meta[data-admin-pwa]').forEach((el) => el.remove());
    };
  }, []);

  return null;
};

export default AdminPWAHead;
