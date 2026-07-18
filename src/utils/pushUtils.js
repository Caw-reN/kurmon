function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushPermissionAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Browser tidak mendukung notifikasi.');
  }

  // 1. Request Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak.');
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // 3. Get VAPID public key from backend
  let raw = sessionStorage.getItem('school_schedule_session_v1');
  if (!raw) {
    raw = localStorage.getItem('school_schedule_session_v1');
    if (raw) sessionStorage.setItem('school_schedule_session_v1', raw);
  }
  const token = JSON.parse(raw)?.authToken;
  if (!token) throw new Error('Anda belum login.');

  const resKey = await fetch('/api/push/public-key');
  const dataKey = await resKey.json();
  if (!dataKey.ok) throw new Error('Gagal mengambil kunci notifikasi.');

  const applicationServerKey = urlBase64ToUint8Array(dataKey.publicKey);

  // 4. Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  });

  // 5. Send to backend
  const resSub = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subscription })
  });

  if (!resSub.ok) {
    throw new Error('Gagal menyimpan langganan notifikasi ke server.');
  }

  return true;
}

export async function checkPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') return false;
  
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

export async function testPushNotification() {
  let raw = sessionStorage.getItem('school_schedule_session_v1');
  if (!raw) {
    raw = localStorage.getItem('school_schedule_session_v1');
    if (raw) sessionStorage.setItem('school_schedule_session_v1', raw);
  }
  const token = JSON.parse(raw)?.authToken;
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res.ok;
}
