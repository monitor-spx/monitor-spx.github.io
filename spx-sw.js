self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let p={};try{p=e.data?.json()||{}}catch{};e.waitUntil(self.registration.showNotification(p.title||'Monitor SPX',{body:p.body||'Novo chamado operacional. Abra o painel.',icon:'/app-icon.svg',tag:p.tag||'spx-alert',renotify:true,data:{url:'/'}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const w=windows.find(c=>c.url.startsWith(self.location.origin+'/'));if(w){await w.focus();return;}await self.clients.openWindow('/');})());});
