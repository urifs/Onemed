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

    // Apple touch icon
    const appleIcon = document.createElement('link');
    appleIcon.id = 'admin-pwa-apple-icon';
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/icons/admin-icon.svg';
    document.head.appendChild(appleIcon);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/admin' })
        .catch(() => {});
    }

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
