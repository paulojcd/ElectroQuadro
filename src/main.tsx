import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline standalone execution
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('ElectroCad DIN: Nova versão disponível em cache.');
  },
  onOfflineReady() {
    console.log('ElectroCad DIN: Aplicação pronta para funcionar offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
