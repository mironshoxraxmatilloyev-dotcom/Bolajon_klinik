import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/config';
import App from './App.jsx';

// Font is loaded immediately via blocking CSS in index.html
// No need for detection - fonts-loaded class is added immediately

// Register Service Worker for PWA - DISABLED for development
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then((registration) => {
//         console.log('SW registered:', registration);
//       })
//       .catch((error) => {
//         console.log('SW registration failed:', error);
//       });
//   });
// }

// Unregister all service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
