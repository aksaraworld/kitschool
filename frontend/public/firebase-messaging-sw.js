/* Auto-generated — do not edit. Run: node scripts/write-fcm-sw.mjs */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({"apiKey":"AIzaSyBwV9D4DTsUjw1cbNWdnIjjAeT2dAuTkfA","authDomain":"kitschool-b86dd.firebaseapp.com","projectId":"kitschool-b86dd","storageBucket":"kitschool-b86dd.firebasestorage.app","messagingSenderId":"597056593218","appId":"1:597056593218:web:cac8fd2d3fd8b4a149fcdb"});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Pesan baru';
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/kitschool-logo.png',
    data: payload.data || {},
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const convId = event.notification.data?.conversationId;
  event.waitUntil(clients.openWindow(convId ? '/messages?c=' + convId : '/messages'));
});
