import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and ignore benign WebSocket errors typical of this sandbox preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('ws://') || msg.includes('wss://')) {
      event.preventDefault();
      console.warn('Suppressed benign sandbox WebSocket rejection:', event.reason);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
