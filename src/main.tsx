import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline and mobile support (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('e-SarPras Service Worker registered successfully:', registration.scope);
        // Cek versi terbaru tiap kali aplikasi dibuka (selagi online) - supaya perbaikan
        // bug tidak "nyangkut" tertahan di cache lama sampai entah kapan. Tidak memaksa
        // reload halaman (biar tidak mengganggu form yang sedang diisi) - versi baru akan
        // otomatis dipakai di buka/reload berikutnya.
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.error('e-SarPras Service Worker registration failed:', error);
      });
  });
}

