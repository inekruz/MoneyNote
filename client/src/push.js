const PUBLIC_VAPID_KEY = 'BDWVddXJrdRbTrAsTnejRQe4aFKDm15OnAgzZKH35JglFXafhBhGtv2AdXD07Bn1oAO9FRUBm62KQnY4QSdNRc8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeUser() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      const token = localStorage.getItem('token');
      await fetch('https://api.minote.ru/ntf/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });
    } catch (err) {
      console.error('Ошибка при подписке на push:', err);
    }
  } else {
    console.warn('Push уведомления не поддерживаются в этом браузере');
  }
}
