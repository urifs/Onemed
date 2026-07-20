import { useEffect } from 'react';

// Deliberately NO service worker here. The previous attempt registered one
// for the member area and it introduced a caching/navigation bug that left
// people stuck on a loading spinner after login until they force-reloaded —
// this component only adds the manifest + iOS/Android meta tags so "Add to
// Home Screen" produces a proper app-like icon, with zero runtime footprint
// on the actual login/navigation flow.
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

    const appleIcon = document.createElement('link');
    appleIcon.id = 'member-pwa-apple-icon';
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/icons/admin-icon-192.png';
    document.head.appendChild(appleIcon);

    return () => {
      document.getElementById('member-pwa-manifest')?.remove();
      document.getElementById('member-pwa-apple-icon')?.remove();
      document.querySelectorAll('meta[data-member-pwa]').forEach((el) => el.remove());
    };
  }, []);

  return null;
};

export default MemberPWAHead;
