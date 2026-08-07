// KILL-SWITCH (2026-08-07): este service worker foi APOSENTADO.
//
// A versão anterior fazia cache-first de JS/CSS. Durante o incidente do TDZ,
// ela cacheou o bundle QUEBRADO e continuou servindo mesmo depois da correção
// já estar no ar — o painel admin ficava preso na tela de erro. É o mesmo
// motivo pelo qual o SW da área de membros já tinha sido removido.
//
// Agora este arquivo não faz cache de nada: ao ser detectado pelo navegador
// (que checa o /admin-sw.js a cada navegação nos clientes que ainda o têm
// registrado), ele APAGA todos os caches, se desregistra e recarrega as abas
// abertas — curando sozinho quem estava preso no bundle antigo. O
// AdminPWAHead não registra mais nenhum SW.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    try { await self.registration.unregister(); } catch { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.navigate(client.url);
    } catch { /* ignore */ }
  })());
});

// Sem handler de fetch: o navegador serve tudo direto da rede, nunca do cache.
