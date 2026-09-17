const CACHE='pslab-v021';
const ASSETS=['./index.html','./app.js?v=0.2.1','./manifest.webmanifest','./version.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.pathname.endsWith('/version.json')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/')){
   e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request))); return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});