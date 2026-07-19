import { useEffect } from 'react';

// Manifest + service worker are only ever registered while a /membros page
// is mounted, so the browser only considers the site "installable" within
// that scope — the install prompt never shows up on the landing page, the
// checkout, or the admin panel.
export const MemberPWAHead = () => {
  useEffect(() => {
    const manifest = document.createElement('link');
    manifest.id = 'member-pwa-manifest';
    manifest.rel = 'manifest';
    manifest.href = '/member-manifest.json';
    document.head.appendChild(manifest);

    const metas: HTMLMetaElement[] = [];
    const addMeta = (name: string, content: string) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      meta.dataset.memberPwa = 'true';
      document.head.appendChild(meta);
      metas.push(meta);
    };

    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    addMeta('apple-mobile-web-app-title', 'OneMed');
    addMeta('mobile-web-app-capable', 'yes');
    addMeta('theme-color', '#EF4444');

    const appleIcon = document.createElement('link');
    appleIcon.id = 'member-pwa-apple-icon';
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/icons/admin-icon-192.png';
    document.head.appendChild(appleIcon);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/member-sw.js', { scope: '/membros' }).catch(() => {});
    }

    return () => {
      document.getElementById('member-pwa-manifest')?.remove();
      document.getElementById('member-pwa-apple-icon')?.remove();
      document.querySelectorAll('meta[data-member-pwa]').forEach(el => el.remove());
    };
  }, []);

  return null;
};

export default MemberPWAHead;
