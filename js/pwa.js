if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      // Listen for waiting service worker
      if (reg.waiting) {
        notifyUpdate(reg);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(reg);
            }
          });
        }
      });
    }).catch(err => console.error('SW reg failed', err));
  });
}

function notifyUpdate(reg) {
  const banner = document.createElement('div');
  banner.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-xl shadow';
  banner.textContent = 'Atualização disponível — Recarregar';
  banner.style.cursor = 'pointer';
  banner.addEventListener('click', () => {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  document.body.appendChild(banner);
}

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  window.location.reload();
});
