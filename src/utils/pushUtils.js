function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getStoredAuthToken() {
  try {
    let raw = sessionStorage.getItem('school_schedule_session_v1');
    if (!raw) {
      raw = localStorage.getItem('school_schedule_session_v1');
      if (raw) sessionStorage.setItem('school_schedule_session_v1', raw);
    }
    return raw ? JSON.parse(raw)?.authToken : null;
  } catch {
    return null;
  }
}

export async function requestPushPermissionAndSubscribe() {
  if (typeof window === 'undefined') return false;

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Browser atau perangkat ini tidak mendukung Web Push Notification.');
  }

  // 1. Request Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak oleh pengguna atau pengaturan browser.');
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // 3. Get VAPID public key from backend
  const token = getStoredAuthToken();
  if (!token) throw new Error('Anda belum login. Silakan login terlebih dahulu.');

  const resKey = await fetch('/api/push/public-key');
  const dataKey = await resKey.json();
  if (!dataKey.ok || !dataKey.publicKey) {
    throw new Error('Gagal mengambil kunci notifikasi dari server.');
  }

  const applicationServerKey = urlBase64ToUint8Array(dataKey.publicKey);

  // 4. Subscribe or renew existing subscription
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
  }

  // 5. Send to backend
  const resSub = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subscription })
  });

  const subJson = await resSub.json().catch(() => ({}));
  if (!resSub.ok) {
    throw new Error(subJson.error || 'Gagal menyimpan langganan notifikasi ke server.');
  }

  return true;
}

export async function checkPushSubscription() {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function getPushStatus() {
  const token = getStoredAuthToken();
  if (!token) return { ok: false, error: 'Not authenticated' };

  try {
    const res = await fetch('/api/push/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function testPushNotification() {
  const token = getStoredAuthToken();
  if (!token) throw new Error('Anda belum login.');

  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}

export async function testScheduleReminderNotification() {
  const token = getStoredAuthToken();
  if (!token) throw new Error('Anda belum login.');

  const res = await fetch('/api/push/test-schedule-reminder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}
